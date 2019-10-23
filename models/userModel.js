const mongoose = require('mongoose');
const passportLocalMongoose=require('passport-local-mongoose');

const stackUserSchema = new mongoose.Schema({
  name: String,
  userame: String,
  email: String,
  password: String,
  skills: String,
  location: String
});

stackUserSchema.plugin(passportLocalMongoose);
module.exports= mongoose.model("User", stackUserSchema);