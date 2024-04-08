const admin = require('firebase-admin');
const { firebaseConfig } = require('../config/firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
});

module.exports = {
  admin,
};
