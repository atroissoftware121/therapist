const { Router } = require("express");
const { celebrate, Joi, Segments } = require("celebrate");
const {
  isAuthorized,
  injectIndividualDetails,
} = require("../middlewares/authMiddlewares");
const {
  IndividualProfileUpdate,
  IndividualRegister,
} = require("../controllers/individualController");

module.exports = (app) => {
  const route = Router();
  app.use("/individual", route);

  route.put(
    "/",
    isAuthorized,
    injectIndividualDetails,
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        fname: Joi.string().required(),
        lname: Joi.string().required(),
        email: Joi.string().required(),
        isMale: Joi.boolean().required(),
      }),
    }),
    IndividualProfileUpdate
  );
  route.put(
    "/register",
    isAuthorized,
    injectIndividualDetails,
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        fname: Joi.string().required(),
        lname: Joi.string().required(),
        email: Joi.string().required(),
        password: Joi.string().required(),
        isMale: Joi.boolean().required(),
      }),
    }),
    IndividualRegister
  );
};
