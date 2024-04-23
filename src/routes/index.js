const { Router } = require("express");
const authRoutes = require("./authRoutes");
const therapistRoutes = require("./therapistRoutes");
const individualRoutes = require("./individualRoutes");
const commonRoutes = require("./commonRoutes");
const paymentRoutes = require("./paymentRoutes");
const reviewRoutes = require("./reviewRoutes");

module.exports = () => {
  const app = Router();
  authRoutes(app);
  therapistRoutes(app);
  individualRoutes(app);
  commonRoutes(app);
  paymentRoutes(app);
  reviewRoutes(app);
  return app;
};
