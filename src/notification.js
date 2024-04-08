const userExtraDetailsModel = require('./mongooseModels/userExtraDetails.model');
const individualNotificationModel = require('./mongooseModels/individual-notification.model');
const therapistModel = require('./mongooseModels/therapist.model');
const { findQuery } = require("./helpers/mongooseHelpers");
const {admin} = require('./config/messaging-system');

const sendNotificationToIndividual = async (therapistId) => {
  console.log('therapistId122', therapistId);
  const notificationData = await findQuery(individualNotificationModel, {
    therapistsIds: { $in: [therapistId] },
  });
  console.log('notificationData', notificationData);
  const therapistData = await findQuery(therapistModel, { _id: therapistId });
  console.log('data12', therapistData);
  for (let notification of notificationData) {
    console.log('notification.individualId', notification.individualId);
    const [individualData] = await findQuery(userExtraDetailsModel, {
      userId: notification.individualId,
    });
    console.log('individualData', individualData);
    if (individualData && individualData.fcmToken) {
      const message = {
        notification: {
          title: `${therapistData.name}`,
          body: `${therapistData.name} is online now`,
        },
        data: {
          senderId: therapistId,
          receiverId: notification.individualId,
          title: `${therapistData.name}`,
          body: `${therapistData.name} is online now`,
        },
        token: individualData.fcmToken,
      };
      console.log('data122222', message);
      const notify = await admin.messaging().send(message);
      console.log('datat12', notify);
    }
  }
};

module.exports = { sendNotificationToIndividual };
