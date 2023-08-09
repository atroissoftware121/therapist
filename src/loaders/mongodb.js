const mongoose = require("mongoose");
const { ATLAS_URI } = require("../config");
module.exports = () => {
  mongoose.set('strictQuery', false)
  mongoose
    .connect(ATLAS_URI,{
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log("mongodb connected successfully"))
    .catch((err) => console.log("mongodb error==>", err));
};
