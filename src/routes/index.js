const { Router } = require("express");
const authRoutes = require("./authRoutes");
const therapistRoutes = require("./therapistRoutes");
const individualRoutes = require("./individualRoutes");
const commonRoutes = require("./commonRoutes");

module.exports = (io) => {
  const app = Router();
  authRoutes(app);
  therapistRoutes(app);
  individualRoutes(app);
  commonRoutes(app, io);
  return app;
};
