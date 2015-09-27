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

mockgoose(mongoose);
mongoose.connect('mongodb://localhost/rotameeting-dev');
mongoose.originalConnect(config.mongo.uri + '/rotameeting-dev');

//Users are cached in memory and rebuilt from userevent db on bootup
const User = mongoose.model('User', UserSchema);
const UserEvent = mongoose.originalModel('UserEvent', UserEventSchema);

const bus = require('servicebus').bus({
	url: config.servicebus.uri + "?heartbeat=60"
});

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

//Listen on bus for create command
bus.listen('user.create', function (payload, o) {
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
			createEvent.save(function (err, userEvent) {
        if (err) {
          // If it failed, return error
          newUser.remove();
          bus.send("user.create.response", { status: 400, commandId: commandId, payload: { type: "error creating event", error: err } });
        }
        else {
          // Send success response back
          bus.send("user.create.response", { status: 200, commandId: commandId, payload: user });
        }
      });
    }
  });
});

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
