package cd.bot.skillbridge.superadmin;

import android.content.DialogInterface;
import android.content.pm.ActivityInfo;
import android.hardware.biometrics.BiometricPrompt;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.util.Log;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.biometric.BiometricManager;
import androidx.core.content.ContextCompat;

public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {

    private static final String TAG = "SupssLauncher";
    private static final String KEY_IS_AUTHENTICATED = "supss_is_authenticated";
    private boolean mIsAuthenticated = false;
    private CancellationSignal mCancellationSignal;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }

        if (savedInstanceState != null) {
            mIsAuthenticated = savedInstanceState.getBoolean(KEY_IS_AUTHENTICATED, false);
        }

        if (!mIsAuthenticated) {
            checkAndPromptBiometrics();
        }
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putBoolean(KEY_IS_AUTHENTICATED, mIsAuthenticated);
    }

    @Override
    protected boolean shouldLaunchImmediately() {
        return mIsAuthenticated;
    }

    private void checkAndPromptBiometrics() {
        BiometricManager biometricManager = BiometricManager.from(this);
        int authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
        int canAuthenticate = biometricManager.canAuthenticate(authenticators);

        if (canAuthenticate == BiometricManager.BIOMETRIC_SUCCESS && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            showBiometricPrompt();
        } else {
            // Biometrics not enrolled, hardware not present, or legacy OS: proceed to launch TWA directly
            mIsAuthenticated = true;
            launchTwa();
        }
    }

    private void showBiometricPrompt() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            mIsAuthenticated = true;
            launchTwa();
            return;
        }

        mCancellationSignal = new CancellationSignal();

        BiometricPrompt.Builder builder = new BiometricPrompt.Builder(this)
                .setTitle(getString(R.string.biometricTitle))
                .setSubtitle(getString(R.string.biometricSubtitle))
                .setDescription(getString(R.string.biometricDesc));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            builder.setAllowedAuthenticators(
                    android.hardware.biometrics.BiometricManager.Authenticators.BIOMETRIC_STRONG |
                    android.hardware.biometrics.BiometricManager.Authenticators.DEVICE_CREDENTIAL
            );
        } else {
            builder.setNegativeButton(
                    "Cancel",
                    ContextCompat.getMainExecutor(this),
                    new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            finish();
                        }
                    }
            );
        }

        BiometricPrompt biometricPrompt = builder.build();

        biometricPrompt.authenticate(
                mCancellationSignal,
                ContextCompat.getMainExecutor(this),
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationError(int errorCode, CharSequence errString) {
                        super.onAuthenticationError(errorCode, errString);
                        Log.d(TAG, "Biometric error: " + errorCode + " - " + errString);
                        if (errorCode != BiometricPrompt.BIOMETRIC_ERROR_USER_CANCELED &&
                            errorCode != BiometricPrompt.BIOMETRIC_ERROR_CANCELED) {
                            Toast.makeText(LauncherActivity.this, "Authentication: " + errString, Toast.LENGTH_SHORT).show();
                        }
                        if (!isFinishing()) {
                            finish();
                        }
                    }

                    @Override
                    public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                        super.onAuthenticationSucceeded(result);
                        Log.d(TAG, "Biometric authentication succeeded");
                        mIsAuthenticated = true;
                        if (!isFinishing()) {
                            launchTwa();
                        }
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        super.onAuthenticationFailed();
                        Log.d(TAG, "Biometric attempt failed; awaiting retry");
                    }
                }
        );
    }

    @Override
    protected void onDestroy() {
        if (mCancellationSignal != null && !mCancellationSignal.isCanceled()) {
            mCancellationSignal.cancel();
        }
        super.onDestroy();
    }

    @Override
    protected Uri getLaunchingUrl() {
        return super.getLaunchingUrl();
    }
}
