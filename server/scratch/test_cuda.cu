#include <cuda_runtime.h>
#include <device_launch_parameters.h>
#include <iostream>
#include <cmath>
#include <cassert>

// CUDA Kernel definitions

__global__ void compute_bce_loss_and_gradient(
    const float* d_output,
    const float* d_pred,
    float* d_loss,
    float* d_d_loss,
    int size)
{
    int idx = blockIdx.x * blockDim.x + threadId.x;
    if (idx < size) {
        float y = d_output[idx];
        float p = d_pred[idx];
        
        // Clamp p to avoid log(0) and division by 0
        if (p < 1e-7f) p = 1e-7f;
        if (p > 1.0f - 1e-7f) p = 1.0f - 1e-7f;
        
        // Binary Cross-Entropy Loss formula
        d_loss[idx] = - (y * logf(p) + (1.0f - y) * logf(1.0f - p));
        
        // Derivative of BCE loss with respect to prediction
        d_d_loss[idx] = (p - y) / (p * (1.0f - p));
    }
}

__global__ void backward_linear_kernel(
    const float* d_d_loss,
    const float* f_act,
    const float* b_act,
    float* d_weight,
    float* d_bias,
    float* d_f_act,
    float* d_b_act,
    const float* weight,
    float lr,
    int batch_size,
    int in_features,
    int out_features)
{
    // One thread per output feature per batch sample: total batch_size * out_features threads
    int idx = blockIdx.x * blockDim.x + threadId.x;
    int sample_idx = idx / out_features;
    int out_idx = idx % out_features;

    if (sample_idx < batch_size && out_idx < out_features) {
        float grad = d_d_loss[idx];

        // 1. Update Bias: bias = bias - lr * gradient
        // Using atomicAdd since multiple samples will add to the same bias index
        atomicAdd(&d_bias[out_idx], -lr * grad);

        // 2. Update Weights: weight = weight - lr * gradient * input
        // W is of shape (out_features, in_features)
        // input features are f_act (size: batch_size * in_features) and b_act (size: batch_size * in_features)
        // Thread out_idx iterates over all in_features to update weights and backpropagate gradients
        for (int in_idx = 0; in_idx < in_features; ++in_idx) {
            float in_val_f = f_act[sample_idx * in_features + in_idx];
            float in_val_b = b_act[sample_idx * in_features + in_idx];

            // Weight updates for forward path and backward path weights
            atomicAdd(&d_weight[out_idx * in_features + in_idx], -lr * grad * in_val_f);
            
            // 3. Backpropagate error to input activations: d_f_act = gradient * weight
            // Weight array has shape [out_features, in_features]
            float w_val = weight[out_idx * in_features + in_idx];
            atomicAdd(&d_f_act[sample_idx * in_features + in_idx], grad * w_val);
            atomicAdd(&d_b_act[sample_idx * in_features + in_idx], grad * w_val);
        }
    }
}

int main() {
    int batch_size = 4;
    int in_features = 5;
    int out_features = 2;
    float lr = 0.1f;

    int num_elements = batch_size * out_features;
    int num_input_elements = batch_size * in_features;
    int num_weight_elements = out_features * in_features;

    // Allocate host memory
    float* h_d_output = (float*)malloc(num_elements * sizeof(float));
    float* h_d_pred = (float*)malloc(num_elements * sizeof(float));
    float* h_f_act = (float*)malloc(num_input_elements * sizeof(float));
    float* h_b_act = (float*)malloc(num_input_elements * sizeof(float));
    float* h_weight = (float*)malloc(num_weight_elements * sizeof(float));
    float* h_bias = (float*)malloc(out_features * sizeof(float));

    // Initialize inputs
    for (int i = 0; i < num_elements; ++i) {
        h_d_output[i] = (i % 2 == 0) ? 1.0f : 0.0f;
        h_d_pred[i] = 0.5f; // Initial prediction
    }
    for (int i = 0; i < num_input_elements; ++i) {
        h_f_act[i] = 0.8f;
        h_b_act[i] = 0.2f;
    }
    for (int i = 0; i < num_weight_elements; ++i) {
        h_weight[i] = 0.5f;
    }
    for (int i = 0; i < out_features; ++i) {
        h_bias[i] = 0.1f;
    }

    // Allocate device memory
    float *d_d_output, *d_d_pred, *d_loss, *d_d_loss;
    float *d_f_act, *d_b_act, *d_weight, *d_bias, *d_f_act_grad, *d_b_act_grad;
    float *d_weight_grad, *d_bias_grad;

    cudaMalloc(&d_d_output, num_elements * sizeof(float));
    cudaMalloc(&d_d_pred, num_elements * sizeof(float));
    cudaMalloc(&d_loss, num_elements * sizeof(float));
    cudaMalloc(&d_d_loss, num_elements * sizeof(float));
    cudaMalloc(&d_f_act, num_input_elements * sizeof(float));
    cudaMalloc(&d_b_act, num_input_elements * sizeof(float));
    cudaMalloc(&d_weight, num_weight_elements * sizeof(float));
    cudaMalloc(&d_bias, out_features * sizeof(float));
    cudaMalloc(&d_f_act_grad, num_input_elements * sizeof(float));
    cudaMalloc(&d_b_act_grad, num_input_elements * sizeof(float));
    cudaMalloc(&d_weight_grad, num_weight_elements * sizeof(float));
    cudaMalloc(&d_bias_grad, out_features * sizeof(float));

    // Copy to device
    cudaMemcpy(d_d_output, h_d_output, num_elements * sizeof(float), cudaMemcpyHostToDevice);
    cudaMemcpy(d_d_pred, h_d_pred, num_elements * sizeof(float), cudaMemcpyHostToDevice);
    cudaMemcpy(d_f_act, h_f_act, num_input_elements * sizeof(float), cudaMemcpyHostToDevice);
    cudaMemcpy(d_b_act, h_b_act, num_input_elements * sizeof(float), cudaMemcpyHostToDevice);
    cudaMemcpy(d_weight, h_weight, num_weight_elements * sizeof(float), cudaMemcpyHostToDevice);
    cudaMemcpy(d_bias, h_bias, out_features * sizeof(float), cudaMemcpyHostToDevice);

    // Initialize gradient variables to 0 on device
    cudaMemset(d_f_act_grad, 0, num_input_elements * sizeof(float));
    cudaMemset(d_b_act_grad, 0, num_input_elements * sizeof(float));
    cudaMemset(d_weight_grad, 0, num_weight_elements * sizeof(float));
    cudaMemset(d_bias_grad, 0, out_features * sizeof(float));

    // 1. Run BCE Loss & Gradient Kernel
    int threads_per_block = 256;
    int blocks = (num_elements + threads_per_block - 1) / threads_per_block;
    compute_bce_loss_and_gradient<<<blocks, threads_per_block>>>(d_d_output, d_d_pred, d_loss, d_d_loss, num_elements);
    cudaDeviceSynchronize();

    // Copy loss and loss_gradient back to verify
    float* h_loss = (float*)malloc(num_elements * sizeof(float));
    float* h_d_loss = (float*)malloc(num_elements * sizeof(float));
    cudaMemcpy(h_loss, d_loss, num_elements * sizeof(float), cudaMemcpyDeviceToHost);
    cudaMemcpy(h_d_loss, d_d_loss, num_elements * sizeof(float), cudaMemcpyDeviceToHost);

    std::cout << "Loss verification:" << std::endl;
    for (int i = 0; i < num_elements; ++i) {
        float expected_loss = - (h_d_output[i] * log(0.5f) + (1.0f - h_d_output[i]) * log(1.0f - 0.5f));
        float expected_grad = (0.5f - h_d_output[i]) / (0.5f * (1.0f - 0.5f));
        std::cout << "Index " << i << ": Actual Loss=" << h_loss[i] << " (Expected=" << expected_loss << "), Actual Grad=" << h_d_loss[i] << " (Expected=" << expected_grad << ")" << std::endl;
        assert(fabs(h_loss[i] - expected_loss) < 1e-4);
        assert(fabs(h_d_loss[i] - expected_grad) < 1e-4);
    }

    // 2. Run Backpropagation Linear Kernel
    int back_threads = 256;
    int back_blocks = (num_elements + back_threads - 1) / back_threads;
    backward_linear_kernel<<<back_blocks, back_threads>>>(
        d_d_loss,
        d_f_act,
        d_b_act,
        d_weight_grad,
        d_bias_grad,
        d_f_act_grad,
        d_b_act_grad,
        d_weight,
        lr,
        batch_size,
        in_features,
        out_features
    );
    cudaDeviceSynchronize();

    // Copy gradients back
    float* h_weight_grad = (float*)malloc(num_weight_elements * sizeof(float));
    float* h_bias_grad = (float*)malloc(out_features * sizeof(float));
    float* h_f_act_grad = (float*)malloc(num_input_elements * sizeof(float));
    float* h_b_act_grad = (float*)malloc(num_input_elements * sizeof(float));

    cudaMemcpy(h_weight_grad, d_weight_grad, num_weight_elements * sizeof(float), cudaMemcpyDeviceToHost);
    cudaMemcpy(h_bias_grad, d_bias_grad, out_features * sizeof(float), cudaMemcpyDeviceToHost);
    cudaMemcpy(h_f_act_grad, d_f_act_grad, num_input_elements * sizeof(float), cudaMemcpyDeviceToHost);
    cudaMemcpy(h_b_act_grad, d_b_act_grad, num_input_elements * sizeof(float), cudaMemcpyDeviceToHost);

    std::cout << "\nLinear Backward verification:" << std::endl;
    // Let's compute expected bias gradient manually:
    // d_bias[out_idx] = sum_{sample} (-lr * d_d_loss[sample * out_features + out_idx])
    for (int out_idx = 0; out_idx < out_features; ++out_idx) {
        float expected_bias_grad = 0.0f;
        for (int sample_idx = 0; sample_idx < batch_size; ++sample_idx) {
            float grad = h_d_loss[sample_idx * out_features + out_idx];
            expected_bias_grad += -lr * grad;
        }
        std::cout << "Bias " << out_idx << ": Actual=" << h_bias_grad[out_idx] << " (Expected=" << expected_bias_grad << ")" << std::endl;
        assert(fabs(h_bias_grad[out_idx] - expected_bias_grad) < 1e-4);
    }

    // Free memory
    cudaFree(d_d_output);
    cudaFree(d_d_pred);
    cudaFree(d_loss);
    cudaFree(d_d_loss);
    cudaFree(d_f_act);
    cudaFree(d_b_act);
    cudaFree(d_weight);
    cudaFree(d_bias);
    cudaFree(d_f_act_grad);
    cudaFree(d_b_act_grad);
    cudaFree(d_weight_grad);
    cudaFree(d_bias_grad);
    
    free(h_d_output);
    free(h_d_pred);
    free(h_f_act);
    free(h_b_act);
    free(h_weight);
    free(h_bias);
    free(h_loss);
    free(h_d_loss);
    free(h_weight_grad);
    free(h_bias_grad);
    free(h_f_act_grad);
    free(h_b_act_grad);

    std::cout << "\nAll assertions passed successfully!" << std::endl;
    return 0;
}
