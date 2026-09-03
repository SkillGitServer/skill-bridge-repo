const express = require('express');
const router = express.Router();
const SystemConfig = require('../models/SystemConfig');

router.post('/system-gateway/dev-override', async (req, res) => {
  const token = req.query.token;
  const expectedToken = process.env.DEV_TOKEN || 'my_super_secret_override_token_2026';

  if (!token || token !== expectedToken) {
    return res.status(401).json({ message: 'Unauthorized: Invalid developer token' });
  }

  const { isBlocked, blockReason, maintenanceMode } = req.body;

  try {
    let config = await SystemConfig.findOne();
    if (!config) {
      config = new SystemConfig();
    }

    if (isBlocked !== undefined) config.isBlocked = isBlocked;
    if (blockReason !== undefined) config.blockReason = blockReason;
    if (maintenanceMode !== undefined) config.maintenanceMode = maintenanceMode;

    await config.save();

    res.json({
      message: 'System configuration updated successfully',
      config
    });
  } catch (error) {
    console.error('Failed to update system configuration:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

router.get('/api/status', async (req, res) => {
  try {
    const config = await SystemConfig.findOne();
    res.json({
      isBlocked: config ? config.isBlocked : false,
      blockReason: config ? config.blockReason : ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
