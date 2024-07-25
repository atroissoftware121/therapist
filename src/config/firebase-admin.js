const config = require('./index');

const privateKey = config.FIREBASE_API_KEY;

module.exports.firebaseConfig = {
  type: 'service_account',
  project_id: 'sahhaya-a0618',
  private_key_id: '55a18974a2372337abed26a6a8510cee71fd9577',
  private_key: privateKey,
  client_email: 'firebase-adminsdk-deflb@sahhaya-a0618.iam.gserviceaccount.com',
  client_id: '114828162394592845452',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url:
    'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-deflb%40sahhaya-a0618.iam.gserviceaccount.com',
};
