// Run this command to install the required dependencies before using:
// npm install cloudinary multer multer-storage-cloudinary

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === 'application/pdf' || (file.originalname && file.originalname.toLowerCase().endsWith('.pdf'));
    return {
      folder: 'career_bridge_docs',
      allowed_formats: ['jpg', 'png', 'pdf', 'jpeg'],
      resource_type: 'image', // Cloudinary treats PDFs as 'image' for inline browser rendering (avoiding forced raw file download)
      format: isPdf ? 'pdf' : undefined
    };
  },
});

// Initialize and Export configured Multer instance (with 10MB file size limit)
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } 
});

module.exports = upload;
