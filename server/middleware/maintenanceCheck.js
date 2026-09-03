const SystemConfig = require('../models/SystemConfig');

const maintenanceCheck = async (req, res, next) => {
  // Always bypass maintenance checks for the dev-override route
  if (req.path === '/system-gateway/dev-override') {
    return next();
  }

  try {
    const config = await SystemConfig.findOne();
    if (config && config.isBlocked) {
      return res.status(503).json({
        message: 'Service Unavailable',
        blockReason: config.blockReason || 'The application is temporarily undergoing maintenance.'
      });
    }
    next();
  } catch (error) {
    console.error('Maintenance check middleware error:', error);
    next();
  }
};

module.exports = maintenanceCheck;
