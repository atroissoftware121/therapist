const config = require('./index');

const privateKey = config.FIREBASE_API_KEY;

module.exports.firebaseConfig = {
    type: 'service_account',
    project_id: 'sahhaya-d4d15',
    private_key_id: '5e111a3a672c489b596b68e28a15e613692996e0',
    private_key: privateKey,
    client_email: 'firebase-adminsdk-ahtco@sahhaya-d4d15.iam.gserviceaccount.com',
    client_id: '108197353503420299168',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url:
      'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-ahtco%40sahhaya-d4d15.iam.gserviceaccount.com',
};
