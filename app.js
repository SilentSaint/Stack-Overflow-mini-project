//jshint esversion:6
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const passport=require('passport');
const LocalStrategy= require('passport-local');
const md5 = require('md5');
const _ = require('lodash');
const app = express();

const passportLocalMongoose=require('passport-local-mongoose');



mongoose.connect("mongodb://localhost:27017/stackUsers", {
  useNewUrlParser: true,
  useFindAndModify: false,
  useCreateIndex: true,
  useUnifiedTopology: true
});


app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(require('express-session')({
  secret: "hyy",
  resave : false,
  saveUninitialized : false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy({ usernameField: 'email',
    passwordField: 'password'},
  function(email, password, done) {
    var pass = md5(password);
    User.findOne({ email: email }, function (err, user) {
        if (err) {
          return done(err);
           }
      if (!user) {
        return done(null, false);
         }
      if (user.password != pass) {
        return done(null, false);
      }else{
        return done(null, user);
      }

    });
  }
));





/////////////////////Schema for all the tables////////////////////////////////////////////


const stackUserSchema = new mongoose.Schema({
  name: String,
  username: String,
  email: String,
  password: String,
  skills: String,
  location: String
});

const answerSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  answerDescription: String
});

const tagsSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  question: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }]

});


const questionSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  questionTitle: String,
  questionDescription:String,
  questionTags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  answers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer'
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

questionSchema.index({questionTitle : 'text'});


stackUserSchema.plugin(passportLocalMongoose);
///////////////////////////////////////TABLE NAMES//////////////////////////////////////////////
const User = mongoose.model("User", stackUserSchema);

const Answer = mongoose.model("Answer", answerSchema);

const Tag = mongoose.model("Tag", tagsSchema);

const Question = mongoose.model("Question", questionSchema);

////////////////////////////Global Variable//////////////////////////////////////////////////
var user= new User();


passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());




////////////////////////////GET REQUESTS//////////////////////////////////////////////////////

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/questionAnswer", isloggedIn , function(req, res) {
  res.render("questionAnswer");
});


app.get("/register", function(req, res) {
  res.render("register");
});
app.get("/user", isloggedIn ,function(req, res) {
  res.render("user");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/compose", isloggedIn ,function(req, res) {
  res.render("compose");
});


app.get("/answer", isloggedIn, function(req, res) {
  res.render("answer");
});

app.get("/stackoverflow", isloggedIn, function(req, res) {
  Question.find({}).populate('questionTags').exec(function(err, questions) {

    if (err) {
      console.log(err);
    } else {
      console.log(questions);
      res.render("stackoverflow", {
        questions: questions
      });
    }
  });
});



app.get("/questionAnswer/:questionId", isloggedIn, function(req, res) {
  Question.find({}).populate('answers').exec(function(err, questions) {
    if (!err) {
      questions.forEach(function(question) {
        if (_.lowerCase(question._id) === _.lowerCase(req.params.questionId)) {
          res.render("questionAnswer", {
            title: question.questionTitle,
            body: question.questionDescription,
            questionId: question._id,
            answers: question.answers
          });
        }
      });
    } else {
      console.log(err);
    }

  });
});

app.get("/users/:id", isloggedIn ,function(req, res) {
  User.findById(req.params.id, function(err, user) {
    if (err) {
      console.log(err);
    } else {

      res.render("users", {
        user: user
      });
    }
  });

});

app.get("/users", isloggedIn, function(req, res) {
  User.find({}, function(err, users) {
    if (err) {
      console.log(err);
    } else {
      res.render("allUsers", {
        users: users
      });
    }
  });

});


app.get("/tags", isloggedIn , function(req, res) {
  Tag.find({}, function(err, tags) {
    if (err) {
      console.log(err);
    } else {
      res.render("allTags", {
        tags: tags
      });
    }
  });
});

app.get("/tags/:id", isloggedIn , function(req, res) {
  Tag.findById(req.params.id).populate('question').exec(function(err, tag) {
    if (err) {
      console.log(err);
    } else {

      console.log(tag);
      res.render("tags", {
        tag: tag

      });
    }
  });
});

app.get("/profile", isloggedIn ,function(req, res){
  res.render("profile",{ user : user });
});

app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/login");
});



////////////////////////////////////POST REQUESTS////////////////////////////////////////////

app.post("/register", function(req, res) {
  const userData = new User({
    _id: new mongoose.Types.ObjectId(),
    name: req.body.firstName + " " + req.body.lastName,
    username: req.body.profileName,
    email: req.body.email,
    password: md5(req.body.password),
    description : req.body.description,
    location : req.body.location
  });
  user=userData;
  console.log(user);

 userData.save(function(err){
  if(err){
    console.log(err);
  }else{
    passport.authenticate("local")(req ,res ,function(){
      res.redirect("/stackoverflow");
    });

  }
});
});



app.post("/questionAnswer", function(req, res) {
  const qId = req.body.questionId;
  const userAnswer = req.body.answerText;

  const answer = new Answer({
    _id: new mongoose.Types.ObjectId(),
    answerDescription: userAnswer
  });

  answer.save(function(err) {
    if (!err) {
      res.redirect("back");
    } else {
      console.log(err);
    }
  });


  Question.findOneAndUpdate({
    _id: qId
  }, {
    "$push": {
      answers: answer._id
    }
  }, function(err, success) {
    if (err) {
      console.log(err);
    }
  });
});

app.post('/login',
  passport.authenticate('local', { failureRedirect: '/login' }),
  function(req, res) {
  User.findOne({ email : req.body.email },function(err,userData){
    user=userData;
    console.log(user);
  });
    res.redirect('/stackoverflow');
  });

/*app.post("/login", function(req, res) {
  const email = req.body.email;
  const password = md5(req.body.password);
  User.findOne({
    email: email
  }, function(err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        if (foundUser.password === password) {

          res.redirect("stackoverflow");
        }
      }
    }
  });
});*/

app.post("/compose", function(req, res) {
  const questionTags = req.body.tagsText.split(" ");
  const question = new Question({
    _id: new mongoose.Types.ObjectId(),
    questionTitle: req.body.titleText,
    questionDescription: req.body.postText,
  });
  question.save(function(err) {
    if (!err) {
      res.redirect("/stackoverflow");
    } else {
      console.log(err);
    }
  });
  // var newTag;
  questionTags.forEach(function(tag) {
    Tag.findOne({
      name: tag
    }, function(err, results) {
      if (err) {
        console.log(err);
      }
      if (!results) {
        var newTag = new Tag({
          _id: new mongoose.Types.ObjectId(),
          name: tag
        });
        newTag.question.push(question._id);
        newTag.save(function(err) {
          if (err) {
            console.log(err);
          }
        });
        Question.findOneAndUpdate({
          _id: question._id
        }, {
          "$push": {
            questionTags: newTag._id
          }
        }, function(err, success) {
          if (err) {
            console.log(err);
          }
        });
      } else {
        //tag is found
        Tag.findOneAndUpdate({
          name: tag
        }, {
          "$push": {
            question: question._id
          }
        }, function(err, success) {
          if (err) {
            console.log(err);
          }
        });
        Tag.findOne({
          name: tag
        }).populate('question').exec(function(err, foundTag) {
          Question.update({
            _id: question._id
          }, {
            "$push": {
              questionTags: foundTag._id
            }
          }, function(err, rawResponse) {
            if (err) {
              console.log(err);
            }
          });
        });
      }
    });
  });

});


app.post("/users", function(req, res) {
  User.find({
    userName: req.body.name
  }, function(err, user) {

    if (err) {
      console.log(err);
    } else if (user == undefined || user == null) {
      alert("No user found");
    } else {

      res.render("allUsers", {
        users: user
      });
    }
  });
});

app.post("/tags", function(req, res) {
  Tag.find({
    name: req.body.tagname
  }, function(err, tag) {

    if (err) {
      alert("no such users");
    } else if (tag == undefined || tag == null) {
      alert("No tag found");
    } else {

      site = "/tags/" + tag[0]._id;
      res.redirect(site);
    }
  });
});

app.post("/stackoverflow", function(req,res){
  Question.find({"$text" : {
    "$search" : req.body.search
  }}).populate('questionTags').exec(function(err,questions){
    console.log(questions);
    if(err){
      alert("No questions found");
    }else{
      res.render("stackoverflow", {
        questions: questions
      });
    }
  });
});

//////////functions////////////

function isloggedIn(req,res,next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect("/login");
}

app.listen(3000, function() {
  console.log("server running on port 3000");

});
