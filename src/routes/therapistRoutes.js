const { Router } = require("express");
const { celebrate, Joi, Segments } = require("celebrate");
const {
  isAuthorized,
  injectTherapistDetails,
  injectIndividualDetails,
} = require("../middlewares/authMiddlewares");
const {
  TherapistRegisterStepFirst,
  TherapistRegisterStepSecond,
  TherapistUpdateProfile,
  TherapistAddOffer,
  TherapistList,
  TherapistTopList,
  TherapistDetailGet,
  TherapistListForApproval,
  ApproveTherapist,
} = require("../controllers/therapistController");
const { upload } = require("../helpers/s3Helper");

module.exports = (app) => {
  const route = Router();
  app.use("/therapist", route);

  route.get("/get-top-list", isAuthorized, TherapistTopList);
  route.get("/get-list", isAuthorized, TherapistList);
  route.get(
    "/get-list-for-approval",
    isAuthorized,
    injectTherapistDetails,
    TherapistListForApproval
  );
  route.put(
    "/updateProfile",
    isAuthorized,
    injectTherapistDetails,
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        name: Joi.string().required(),
        email: Joi.string().required(),
        age: Joi.number().required(),
        specialization: Joi.array().required(),
        qualification: Joi.string().required(),
        charges: Joi.number().required(),
        language: Joi.string().required(),
        summary: Joi.string().required(),
        location: Joi.string().required(),
        gender: Joi.string().required(),
        image: Joi.string().optional(),
      }),
    }),
    TherapistUpdateProfile
  );
  route.put(
    "/register-step-first",
    isAuthorized,
    injectTherapistDetails,
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        name: Joi.string().required(),
        email: Joi.string().required(),
        password: Joi.string().required(),
        image: Joi.string().optional(),
      }),
    }),
    TherapistRegisterStepFirst
  );
  route.put(
    "/register-step-second",
    isAuthorized,
    injectTherapistDetails,
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        age: Joi.number().required(),
        specialization: Joi.array().required(),
        gender: Joi.string().required(),
        qualification: Joi.string().required(),
        charges: Joi.number().required(),
        language: Joi.string().required(),
        summary: Joi.string().required(),
        location: Joi.string().required(),
        documents: Joi.array().required(),
      }),
    }),
    TherapistRegisterStepSecond
  );
  route.post(
    "/add-offer",
    isAuthorized,
    injectTherapistDetails,
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        discountedCharges: Joi.number().required(),
      }),
    }),
    TherapistAddOffer
  );
  route.get("/:_id", isAuthorized, injectTherapistDetails, TherapistDetailGet);
  route.get("/get-detail/:_id", isAuthorized, injectIndividualDetails, TherapistDetailGet);

  route.patch(
    "/approve-therapist",
    isAuthorized,
    injectTherapistDetails,
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        _id: Joi.string().required(),
      }),
    }),
    ApproveTherapist
  );

};
