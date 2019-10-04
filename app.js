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


/////////////////////Schema for all the tables////////////////////////////////////////////

const stackUserSchema = new mongoose.Schema({
  name : String,
  profileName : String,
  email : String,
  password : String
});

const questionSchema = new mongoose.Schema({
  questionTitle : String,
  questionDescription : String,
  questionTags : Array
});


///////////////////////////////////////TABLE NAMES//////////////////////////////////////////////
const User = mongoose.model("User",stackUserSchema);

const Question = mongoose.model("Question",questionSchema);
////////////////////////////GET REQUESTS//////////////////////////////////////////////////////

app.get("/",function(req,res){
  res.render("home");
});

app.get("/register",function(req,res){
  res.render("register");
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/compose",function(req,res){
  res.render("compose");
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/stackoverflow",function(req,res){
  Question.find({},function(err,questions){
    if(err){
      console.log(err);
    }
      res.render("stackoverflow",{
        questions : questions
      });
  });
});

////////////////////////////////////POST REQUESTS////////////////////////////////////////////

app.post("/register",function(req,res){
  const userData = new User({
    name : req.body.firstName + " " + req.body.lastName,
    userName : req.body.profileName,
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

app.post("/compose",function(req,res){
  const question = new Question({
    questionTitle : req.body.titleText,
    questionDescription : req.body.postText,
    questionTags : req.body.tagsText.split(" ")
  });
  question.save(function(err){
    if(!err){
      res.redirect("/stackoverflow");
    }else{
      console.log(err);
    }
  });
});


app.listen(3000,function(){
  console.log("server running on port 3000");
});