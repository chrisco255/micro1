'use strict';
var express = require('express');
var router = express.Router();
// New Code
var mongo = require('mongodb');
var monk = require('monk');
var config = require('../defaults');
var UserSchema = require('./user');
var UserEventSchema = require('./userevent');
var mongoose = require('mongoose');
var mockgoose = require('mockgoose');
var _ = require('underscore');
mockgoose(mongoose);
mongoose.connect('mongodb://localhost:27017/rotameeting-dev');
var User = mongoose.model('User', UserSchema);

var UserEvent = mongoose.originalModel('UserEvent', UserEventSchema);
mongoose.originalConnect('mongodb://localhost:27017/rotameeting-dev');

var db = monk(config.mongo.uri + '/rotameeting-dev'); //monk('localhost:27017/nodetest1');

const bus = require('servicebus').bus({
	url: config.servicebus.uri + "?heartbeat=60"
});

console.log('MongoURI from config: ' + config.mongo.uri);
console.log('ServiceBusURI from config: ' + config.servicebus.uri);
console.log('Port from env: ' + process.env.PORT);

//var eventCollection = db.get('userevents');
UserEvent.find({}, function(err, events) {
	events.forEach(function(userevent) {
		if(userevent.event === "createUser") {
			let user = new User(userevent.data);
			user.save(function(err, user) {
				if(err) {
					throw Error("Error creating user from event data");
				}
			});
		}
	});
});



bus.listen('user.create', function (payload, o) {
  // Set our collection
  //var collection = db.get('usercollection');
  let commandId = payload.commandId,
      data = payload.data;

  var newUser = new User(data);
  newUser.save(function(err, user) {
    if (err) {
      // If it failed, return error
      bus.send("user.create.response", { status: 400, commandId: commandId, payload: { type: "error", error: err } });
    }
    else {
      let createEvent = new UserEvent({ "event" : "createUser", "data" : { _id: user._id, name: user.name, email: user.email } });
      //var collection = db.get('userevents');

      // Submit to the DB
			createEvent.save(function (err, userEvent) {
        if (err) {
          // If it failed, return error
          //newUser.remove();
          bus.send("user.create.response", { status: 400, commandId: commandId, payload: { type: "error creating event", error: err } });
        }
        else {
          // And forward to success page
          bus.send("user.create.response", { status: 200, commandId: commandId, payload: user });
        }
      });
    }
  });

});


//bus.listen('user.create', function (payload, o) {
//	// Set our collection
//	var collection = db.get('usercollection');
//  let commandId = payload.commandId,
//      data = payload.data;
//
//  if(data.username && data.useremail) {
//		// Submit to the DB
//		collection.insert(data, function (err, doc) {
//			if (err) {
//				// If it failed, return error
//				bus.send("user.create.response", { status: 400, commandId: commandId, payload: { type: "error", error: err } });
//			}
//			else {
//				// And forward to success page
//				bus.send("user.create.response", { status: 200, commandId: commandId, payload: doc });
//			}
//		});
//	} else {
//		bus.send("user.create.response", { status: 400, commandId: commandId, payload: { type: "error", error: "User must have username and useremail" } });
//	}
//});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'User Service' });
});

/* GET Hello World page. */
router.get('/helloworld', function(req, res) {
  res.render('helloworld', { title: 'Hello, World!' });
});

/* GET Userlist page. */
router.get('/userlist', function(req, res) {
  User.find({}, function (err, users) {
    if(err) { return res.status(400).send(err); }
    return res.status(200).json(users);
  });
  //var db = req.db;
  //var collection = db.get('usercollection');
  //collection.find({},{},function(e,docs){
  //  res.render('userlist', {
  //    "userlist" : docs
  //  });
  //});
});

/* POST to Add User Service */
router.post('/adduser', function(req, res) {
  // Set our internal DB variable
  var db = req.db;

  // Get our form values. These rely on the "name" attributes
  var userName = req.body.username;
  var userEmail = req.body.useremail;

  // Set our collection
  var collection = db.get('usercollection');

  // Submit to the DB
  collection.insert({
    "username" : userName,
    "email" : userEmail
  }, function (err, doc) {
    if (err) {
      // If it failed, return error
      res.send("There was a problem adding the information to the database.");
    }
    else {
      // And forward to success page
      res.sendStatus(200);
    }
  });
});

module.exports = router;
