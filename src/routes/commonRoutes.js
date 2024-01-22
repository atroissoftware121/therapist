const { Router } = require("express");
const { GetImage, UploadImages } = require("../controllers/commonController");
const { upload } = require("../helpers/s3Helper");
const {
  injectUserDetails,
  isAuthorized,
} = require("../middlewares/authMiddlewares");
const {
  Logout
} = require("../controllers/commonController");

module.exports = (app) => {
  const route = Router();
  app.use("/", route);
  route.patch(
    "/logout",
    isAuthorized,
    injectUserDetails,
    Logout
  );
  route.get("/image/:key", GetImage);
  route.post("/image", upload.single("image"), UploadImages);
};
