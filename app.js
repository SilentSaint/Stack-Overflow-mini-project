//jshint esversion:6
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const md5 = require('md5');

const app = express();
app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended : true}));

mongoose.connect("mongodb://localhost:27017/stackUsers",{
  useNewUrlParser : true,
  useFindAndModify: false,
  useCreateIndex: true,
  useUnifiedTopology: true
});

const stackUserSchema = new mongoose.Schema({
  email : String,
  password : String
});

const User = mongoose.model("User",stackUserSchema);

app.get("/",function(req,res){
  res.render("home");
});

app.get("/register",function(req,res){
  res.render("register");
});

app.post("/register",function(req,res){
  const userData = new User({
    email : req.body.email,
    password : md5(req.body.password)
  });
  userData.save(function(err){
    if(!err){
      res.render("stackoverflow");
    }else{
      console.log(err);
    }
  });

});

app.get("/login",function(req,res){
  res.render("login");
});

app.post("/login",function(req,res){
  const email = req.body.email;
  const password = md5(req.body.password);
  User.findOne({email : email},function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        if(foundUser.password === password){
          res.render("stackoverflow");
        }
      }
    }
  });
});






app.listen(3000,function(){
  console.log("server running on port 3000");
});
