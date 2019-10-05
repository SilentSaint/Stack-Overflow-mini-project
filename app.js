//jshint esversion:6
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const md5 = require('md5');
const _ = require('lodash');
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
  questionTags : Array,
  answers : Array
});

const tagsSchema = new mongoose.Schema({
  name : String
});

///////////////////////////////////////TABLE NAMES//////////////////////////////////////////////
const User = mongoose.model("User",stackUserSchema);

const Question = mongoose.model("Question",questionSchema);

const Tag = mongoose.model("Tag",tagsSchema);
////////////////////////////GET REQUESTS//////////////////////////////////////////////////////

app.get("/",function(req,res){
  res.render("home");
});

app.get("/questionAnswer",function(req,res){
  res.render("questionAnswer");
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

app.get("/answer",function(req,res){
  res.render("answer");
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

app.get("/questionAnswer/:questionId",function(req,res){
  Question.find({},function(err,questions){
    if(!err){
      questions.forEach(function(question){
        if(_.lowerCase(question._id) === _.lowerCase(req.params.questionId)){
          res.render("questionAnswer",{
            title : question.questionTitle,
            body : question.questionDescription,
            questionId : question._id,
            answers : question.answers
          });
        }
      });
    }else{
      console.log(err);
    }
  });
});
//////////////////////////////////////functions///////////////////////////////////////////////
// function getAllTags(){
//   var uniqueTags = [];
//   var tagsArray = [];
//   Question.find({},function(err,questions){
//     if(!err){
//       questions.forEach(function(question){
//         question.questionTags.forEach(function(tag){
//            tagsArray.push(tag);
//
//         });
//       });
//       uniqueTags = tagsArray.filter((v, i, a) => a.indexOf(v) === i);
//       console.log(uniqueTags);
//       const tags = new Tag({
//         name : [...uniqueTags]
//       });
//       tags.save(function(err){
//         if(!err){
//           console.log("success");
//         }
//       });
//     }else {
//       console.log("error " ,err);
//     }
//     return tagsArray;
//   });
//   // console.log(query);
//   // console.log(query.tagsArray);
//   // console.log("tags Array 2 : ",tagsArray);
//   // console.log("uniqueArray" ,uniqueTags);
//   // return allTags;
// }
// console.log(getAllTags());
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
      res.redirect("stackoverflow");
    }else{
      console.log(err);
    }
  });

});

app.post("/questionAnswer",function(req,res){
  const qId = req.body.questionId;
  const answer = req.body.answerText;
  const question = Question.findOne({_id : qId});
  console.log(answer);

  Question.findOneAndUpdate({_id : qId},{
      "$push" : { answers : answer}
  },function(err,success){
    if(err){
      console.log(err);
    }
    else{
      res.redirect("stackoverflow");
      console.log("success");
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
          res.redirect("stackoverflow");
        }
      }
    }
  });
});

// app.post("/questionAnswer",function(req,res){
//   console.log(req.body);
// });

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
