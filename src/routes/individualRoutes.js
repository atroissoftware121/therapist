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
        lname: Joi.string().optional(),
        email: Joi.string().required(),
        gender: Joi.string().required(),
        image: Joi.string().optional(),
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
        lname: Joi.string().optional(),
        email: Joi.string().required(),
        password: Joi.string().required(),
        gender: Joi.string().required(),
        image: Joi.string().optional(),
      }),
    }),
    IndividualRegister
  );
};
