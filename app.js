//jshint esversion:6
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const md5 = require('md5');
const _ = require('lodash');
const app = express();

const passportLocalMongoose = require('passport-local-mongoose');

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
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  function(email, password, done) {
    var pass = md5(password);
    User.findOne({
      email: email
    }, function(err, user) {
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false);
      }
      if (user.password != pass) {
        return done(null, false);
      } else {
        return done(null, user);
      }

    });
  }
));

/////////////////////Schema for all the tables////////////////////////////////////////////

const stackUserSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: String,
  username: String,
  email: String,
  password: String,
  description: String
});

const answerSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  answerDescription: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
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
  questionDescription: String,
  questionTags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  updatedAt: Date,
  answers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer'
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

//implementation of stored procedure

questionSchema.method('numberOfAnswers', function() {
  let count = 0;
  this.answers.forEach(function(answer) {
    count++;
  });
  return count;
});

//implementation of trigger

questionSchema.pre('save', function(next) {
  this.set({
    updatedAt: new Date()
  });
  next();
});

const blogschema = new mongoose.Schema({
  title: String,
  image: String,
  body: String,
  created: {
    type: Date,
    default: Date.now
  }
});

questionSchema.index({
  questionTitle: 'text'
});

stackUserSchema.plugin(passportLocalMongoose);

///////////////////////////////////////TABLE NAMES//////////////////////////////////////////////

const User = mongoose.model("User", stackUserSchema);

const Answer = mongoose.model("Answer", answerSchema);

const Tag = mongoose.model("Tag", tagsSchema);

const Question = mongoose.model("Question", questionSchema);

const blog = mongoose.model("blog", blogschema);

////////////////////////////Global Variable//////////////////////////////////////////////////

var user = new User();
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

////////////////////////////GET REQUESTS//////////////////////////////////////////////////////

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/questionAnswer", isloggedIn, function(req, res) {
  res.render("questionAnswer");
});

app.get("/register", function(req, res) {
  res.render("register");
});
app.get("/user", isloggedIn, function(req, res) {
  res.render("user");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/compose", isloggedIn, function(req, res) {
  res.render("compose");
});

app.get("/answer", isloggedIn, function(req, res) {
  res.render("answer");
});

app.get("/stackoverflow", isloggedIn, function(req, res) {
  Question.find({}).populate('questionTags').populate('userId').exec(function(err, questions) {
    if (err) {
      console.log(err);
      res.status(404).send('<h1>Error</h1>');
    } else {
      res.render("stackoverflow", {
        questions: questions
      });
    }
  });
});

app.get("/questionAnswer/:questionId", isloggedIn, function(req, res) {
  Question.find({}).populate('answers').populate('userId').exec(function(err, questions) {
    if (!err) {
      questions.forEach(function(question) {
        if (_.lowerCase(question._id) === _.lowerCase(req.params.questionId)) {
          res.render("questionAnswer", {
            title: question.questionTitle,
            body: question.questionDescription,
            questionId: question._id,
            answers: question.answers,
            user: question.userId,
            cuser: req.user,
            numberofAnswers: question.numberOfAnswers()
          });
        }
      });
    } else {
      console.log(err);
      res.status(404).send('<h1>Error</h1>');
    }
  });
});

app.get("/users/:id", isloggedIn, function(req, res) {
  User.findById(req.params.id, function(err, user) {
    if (err) {
      console.log(err);
      res.status(404).send('<h1>Error</h1>');
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
      res.status(404).send('<h1>Error</h1>');
    } else {
      res.render("allUsers", {
        users: users
      });
    }
  });
});

app.get("/tags", isloggedIn, function(req, res) {
  Tag.find({}, function(err, tags) {
    if (err) {
      console.log(err);
      res.status(404).send('<h1>Error</h1>');
    } else {
      res.render("allTags", {
        tags: tags
      });
    }
  });
});

app.get("/tags/:id", isloggedIn, function(req, res) {
  Tag.findById(req.params.id).populate({
    path: 'question',
    populate : [ {
      path : 'questionTags',
    },{
      path : 'userId'
    }]
  }).exec(function(err, tag) {
    if (err) {
      console.log(err);
      res.status(404).send('<h1>Error</h1>');
    } else {
      res.render("tags",{
        tag: tag
      });
    }
  });
});

app.get("/questionAnswer/:id/update", function(req, res) {
  Question.findById(req.params.id).populate('questionTags').exec(function(err, question) {
    var str = "";
    question.questionTags.forEach(function(item) {
      str = str + " " + item.name;
    });
    res.render("editQuestion", {
      question: question,
      str: str
    });
  });
});

app.get("/questionAnswer/:id/delete", function(req, res) {
  Question.findByIdAndRemove(req.params.id, function(err, success) {
    if (err) {
      console.log(err);
      var site = "/questionAnswer/" + req.params.id;
      res.redirect(site);
    } else {
      res.redirect("/stackoverflow");
    }
  });
});

app.get("/profile", isloggedIn, function(req, res) {
  res.render("profile", {
    user: user
  });
});

app.get("/blogs", isloggedIn, function(req, res) {
  blog.find({}, function(err, blogs) {
    if (err) {
      console.log(err);
      res.status(404).send('<h1>Error</h1>');
    } else {
      res.render("allBlogs", {
        blogs: blogs
      });
    }
  });
});

app.get("/blogs/new", isloggedIn, function(req, res) {
  res.render("newBlog");
});

app.get("/blogs/:id", isloggedIn, function(req, res) {
  blog.findById(req.params.id, function(err, blog) {
    if (err) {
      res.redirect("/blogs");
    } else {
      res.render("showBlog", {
        blog: blog
      });
    }

  });
});

app.get("/blogs/:id/edit", isloggedIn, function(req, res) {
  blog.findById(req.params.id, function(err, blog) {
    if (err) {
      res.redirect("/blogs");
    } else {
      res.render("editBlog", {
        blog: blog
      });
    }
  });
});

app.get("/blogs/:id/delete", isloggedIn, function(req, res) {
  blog.findByIdAndRemove(req.params.id, function(err) {
    if (err) {
      res.redirect("/blogs");
    } else {
      res.redirect("/blogs");
    }
  });
});
app.get("/profile", isloggedIn, function(req, res) {
  res.render("profile", {
    user: user
  });
});

app.get("/logout", function(req, res) {
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
    description: req.body.description
  });
  user = userData;
  userData.save(function(err) {
    if (err) {
      console.log(err);
      res.status(404).send('<h1>Error</h1>');
    } else {
      passport.authenticate("local")(req, res, function() {
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
      res.status(404).send('<h1>Error</h1>');
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
      res.status(404).send('<h1>Error</h1>');
    }
  });
});

app.post('/login',
  passport.authenticate('local', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    User.findOne({
      email: req.body.email
    }, function(err, userData) {
      user = userData;
    });
    res.redirect('/stackoverflow');
  });

app.post("/compose", function(req, res) {
  const questionTags = req.body.tagsText.split(" ");
  const question = new Question({
    _id: new mongoose.Types.ObjectId(),
    questionTitle: req.body.titleText,
    questionDescription: req.body.postText,
    userId: req.user._id
  });
  question.save(function(err) {
    if (err) {
      console.log(err);
      res.status(404).send('<h1>Error</h1>');
    }
  });
  questionTags.forEach(function(tag) {
    Tag.findOne({
      name: tag
    }, function(err, results) {
      if (err) {
        console.log(err);
        res.status(404).send('<h1>Error</h1>');
      }
      if (!results) {
        var newTag = new Tag({
          _id: new mongoose.Types.ObjectId(),
          name: tag
        });
        newTag.question.push(question._id);
        newTag.save(function(err) {
          if (!err) {
            Question.findOneAndUpdate({
              _id: question._id
            }, {
              "$push": {
                questionTags: newTag._id
              }
            }, function(err) {
              if (err) {
                console.log(err);
                res.status(404).send('<h1>Error</h1>');
              }
            });
          } else {
            console.log(err);
            res.status(404).send('<h1>Error</h1>');
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
        }, function(err) {
          if (err) {
            console.log(err);
            res.status(404).send('<h1>Error</h1>');
          }else {
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
          }, function(err) {
            if (err) {
              console.log(err);
              res.status(404).send('<h1>Error</h1>');
            }
          });
        });
      }
    });
  });
  res.redirect('/stackoverflow');
});

app.post("/users", function(req, res) {
  User.find({
    username: req.body.name
  }, function(err, user) {

    if (err) {
      console.log(err);
      res.status(404).send('<h1>Error</h1>');
    } else if (user == undefined || user == '') {
      res.status(404).send('<h1>Not found</h1>');
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
      console.log(err);
      res.status(404).send('<h1>Error</h1>');
    } else if (tag == undefined || tag == '') {
      res.status(404).send('<h1>Not found</h1>');
    } else {
      site = "/tags/" + tag[0]._id;
      res.redirect(site);
    }
  });
});

app.post("/stackoverflow", function(req, res) {
  Question.find({
    "$text": {
      "$search": req.body.search
    }
  }).populate('questionTags').exec(function(err, questions) {

    if (err) {
      console.log(err);
      res.status(404).send('<h1>Error</h1>');
    } else {
      res.render("stackoverflow", {
        questions: questions
      });
    }
  });
});

app.post("/questionAnswer/:id/update", function(req, res) {

Question.findByIdAndUpdate(req.params.id, req.body.question, function(err, question) {
    if (err) {
      console.log(err);
      res.status(404).send('<h1>Error</h1>');
    } else {
      var site = "/questionAnswer/" + req.params.id;
      res.redirect(site);
    }

  });

});

app.post("/blogs", function(req, res) {
  blog.create(req.body.blog, function(err, newBlog) {
    if (err) {
      console.log(err);
      res.status(404).send('<h1>Error</h1>');
    } else {
      res.redirect("/blogs");
    }
  });
});

app.post("/blogs/:id", function(req, res) {
  blog.findByIdAndUpdate(req.params.id, req.body.blog, function(err, updatedblog) {
    if (err) {
      res.redirect("/blogs");
    } else {
      res.redirect("/blogs/" + req.params.id);
    }
  });
});

//////////functions////////////

function isloggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

app.listen(3000, function() {
  console.log("server running on port 3000");
});
