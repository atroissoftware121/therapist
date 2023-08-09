const bcrypt = require("bcrypt");
const saltRounds = 10;

const genratePasswordHash = (password) =>
  new Promise((resolve) => {
    bcrypt.hash(password, saltRounds, function (err, hash) {
      resolve(hash);
    });
  });

const comparePassword = (password, hash) =>
  new Promise((resolve) => {
    bcrypt.compare(password, hash, function (err, result) {
      resolve(result);
    });
  });

module.exports = { genratePasswordHash, comparePassword };
