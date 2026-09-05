const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
require('dotenv').config();
const maintenanceCheck = require('./middleware/maintenanceCheck');
const devRoutes = require('./routes/devRoutes');
const resultRoutes = require('./routes/resultRoutes');
const mentorExamRoutes = require('./routes/mentorExamRoutes');
const chatRoutes = require('./routes/chatRoutes');
const trialRoutes = require('./routes/trialRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const profileRoutes = require('./routes/profileRoutes');
const authRoutes = require('./routes/authRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const systemRoutes = require('./routes/systemRoutes');
const landingRoutes = require('./routes/landingRoutes');
const jobRoutes = require('./routes/jobRoutes');

const app = express();
const path = require('path');
const fs = require('fs');

// Digital Asset Links for Android TWAs
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(path.join(__dirname, '../client/public/.well-known/assetlinks.json'));
});

// Serve Android APK downloads directly from android project folder
const androidDir = path.join(__dirname, '../android');
app.get('/downloads/:apkName', (req, res) => {
  const name = req.params.apkName.toLowerCase();
  let apkPath = null;
  if (name.includes('spark')) {
    apkPath = path.join(androidDir, 'sparks-twa/Sparks-release-signed.apk');
  } else if (name.includes('vault')) {
    apkPath = path.join(androidDir, 'vault-twa/Vault-release-signed.apk');
  } else if (name.includes('supss')) {
    apkPath = path.join(androidDir, 'supss-twa/Supss-release-signed.apk');
  }
  if (apkPath && fs.existsSync(apkPath)) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    return res.sendFile(apkPath);
  }
  res.status(404).send('APK not found');
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(maintenanceCheck);

// Routes
app.use('/', devRoutes);
app.use('/', resultRoutes);
app.use('/', mentorExamRoutes);
app.use('/', chatRoutes);
app.use('/', trialRoutes);
app.use('/', paymentRoutes);
app.use('/', profileRoutes);
app.use('/', authRoutes);
app.use('/', resumeRoutes);
app.use('/api/system', systemRoutes);
app.use('/', systemRoutes);
app.use('/', landingRoutes);
app.use('/', jobRoutes);

// Test Route
app.get('/', (req, res) => {
  res.send('Skill Hub API is running...');
});

// Connect to MongoDB
connectDB();

// Initialize Auto-Delete Background Cleaner & System Metrics Cache
const { runAutoDeleteCleanup } = require('./utils/autoDeleteCleaner');
const { recalculateSystemMetrics } = require('./utils/systemMetrics');

setTimeout(() => {
  recalculateSystemMetrics();
  runAutoDeleteCleanup();
  setInterval(() => {
    runAutoDeleteCleanup();
  }, 6 * 60 * 60 * 1000);
}, 5000);

// Server Listening
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
