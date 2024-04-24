const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

const genrateToken = ({
  data,
  exp = Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60,
}) =>
  jwt.sign(
    {
      exp,
      data,
    },
    JWT_SECRET
  );

const getTokenData = (token) =>
  new Promise((resolve) =>
    jwt.verify(token, JWT_SECRET, function (err, decoded) {
      // decoded.data = {...decoded.data, iat: decoded.iat};
      resolve(decoded.data);
    })
  );

module.exports = {
  genrateToken,
  getTokenData,
};
