'use strict';
const express = require('express');
const router = express.Router();
const mongo = require('mongodb');
const config = require('../config/defaults');
const UserSchema = require('./user');
const UserEventSchema = require('./userevent');
const mongoose = require('mongoose');
const mockgoose = require('mockgoose');
const _ = require('underscore');
const CBBus = require('../lib/cbbus');
const userQ = CBBus.createQueue({ queueName: 'user' });

mockgoose(mongoose);
mongoose.connect('mongodb://localhost/rotameeting-dev');
mongoose.originalConnect(config.mongo.uri + '/rotameeting-dev');

//Users are cached in memory and rebuilt from userevent db on bootup
const User = mongoose.model('User', UserSchema);
const UserEvent = mongoose.originalModel('UserEvent', UserEventSchema);

console.log('MongoURI from config: ' + config.mongo.uri);
console.log('ServiceBusURI from config: ' + config.servicebus.uri);
console.log('Port from env: ' + process.env.PORT);

//rebuild in memory cache of users by replaying all past events
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

//define commands for user queue
const Commands = {
  get: getUsers,
  post: createUser
};

userQ.listen(function(msg) {
  let cmd = Commands[msg.cmd];
  if(typeof cmd === 'function') { cmd(msg); }
});

function createUser(msg) {
  let reqId = msg.reqId,
      payload = msg.payload;

  var newUser = new User(payload);
  newUser.save(function(err, user) {
    if (err) {
      // If it failed, return error
      userQ.sendResponse({ status: 400, reqId, payload: { type: "error", error: err } });
    }
    else {
      let newEvent = new UserEvent({ "event" : "createUser", "data" : { _id: user._id, name: user.name, email: user.email } });
      newEvent.save(function (err, userEvent) {
        if (err) {
          // If it failed, return error
          newUser.remove();
          userQ.sendResponse({ status: 400, reqId, payload: { type: "error creating event", error: err } });
        }
        else {
          // Send success response back
          userQ.sendResponse({ status: 200, reqId, payload: user });
        }
      });
    }
  });
}

function getUsers(msg) {
  let reqId = msg.reqId;

  User.find(function(err, users) {
    if (err) {
      // If it failed, return error
      userQ.sendResponse({ status: 400, reqId, payload: { type: "error", error: err } });
    } else {
      userQ.sendResponse({ status: 200, reqId, payload: users })
    }
  });
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'User Service' });
});

/* GET Userlist page. */
router.get('/users', function(req, res) {
  User.find({}, function (err, users) {
    if(err) { return res.status(400).send(err); }
    return res.status(200).json(users);
  });
});

module.exports = router;
