const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

const genrateToken = ({
  data,
}) =>
  jwt.sign(
    {
      data,
    },
    JWT_SECRET
  );

  const getTokenData = (token) =>
    new Promise((resolve, reject) =>
      jwt.verify(token, JWT_SECRET, function (err, decoded) {
        if (err || !decoded) {
          return reject(new Error("Invalid or expired token"));
        }
        resolve({ ...decoded.data, iat: decoded.iat });
      })
    );
  
module.exports = {
  genrateToken,
  getTokenData,
};
