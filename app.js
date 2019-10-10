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
  _id : mongoose.Schema.Types.ObjectId,
  name : String,
  profileName : String,
  email : String,
  password : String
});

const answerSchema = new mongoose.Schema({
  _id : mongoose.Schema.Types.ObjectId,
  answerDescription : String
});

const tagsSchema = new mongoose.Schema({
  _id : mongoose.Schema.Types.ObjectId,
  name : String,
  question : [{
    type : mongoose.Schema.Types.ObjectId,
    ref : 'Question'
  }]
});


const questionSchema = new mongoose.Schema({
  _id : mongoose.Schema.Types.ObjectId,
  questionTitle : String,
  questionDescription : String,
  questionTags :[{
    type : mongoose.Schema.Types.ObjectId,
    ref : 'Tag'
  }],
  answers : [{
    type : mongoose.Schema.Types.ObjectId,
    ref : 'Answer'
  }]
});


///////////////////////////////////////TABLE NAMES//////////////////////////////////////////////
const User = mongoose.model("User",stackUserSchema);

const Answer = mongoose.model("Answer",answerSchema);

const Tag = mongoose.model("Tag",tagsSchema);

const Question = mongoose.model("Question",questionSchema);

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
  Question.find({}).populate('answers').exec(function(err,questions){
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

////////////////////////////////////POST REQUESTS////////////////////////////////////////////

app.post("/register",function(req,res){
  const userData = new User({
    _id : new mongoose.Types.ObjectId(),
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
  const userAnswer = req.body.answerText;

  const answer = new Answer({
    _id : new mongoose.Types.ObjectId(),
    answerDescription : userAnswer
  });

  answer.save(function(err){
    if(!err){
      res.redirect('back');
    }else{
      console.log(err);
    }
  });


  Question.findOneAndUpdate({_id : qId},{
      "$push" : { answers : answer._id}
  },function(err,success){
    if(err){
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
          res.redirect("stackoverflow");
        }
      }
    }
  });
});

app.post("/compose",function(req,res){
  const questionTags = req.body.tagsText.split(" ");
  const question = new Question({
    _id : new mongoose.Types.ObjectId(),
    questionTitle : req.body.titleText,
    questionDescription : req.body.postText,
  });
  question.save(function(err){
    if(!err){
      res.redirect("/stackoverflow");
    }else{
      console.log(err);
    }
  });

  questionTags.forEach(function(tag){
    Tag.findOne({name : tag},function(err,results){
      if(err){
        console.log(err);
      }
      if(!results){
        const newTag = new Tag({
          _id : new mongoose.Types.ObjectId(),
          name : tag
        });
        newTag.question.push(question._id);
        newTag.save(function(err){
          if(!err){
            console.log("tag saved successfully");
          }else{
            console.log(err);
          }
        });
      }else{
        Tag.findOneAndUpdate({name : tag},{
            "$push" : { question : question._id}
        },function(err,success){
          if(err){
            console.log(err);
          }else{
            console.log("successfully updated a existing tag");
          }
        });
      }
    });
  });

});


app.listen(3000,function(){
  console.log("server running on port 3000");
});
