'use strict';
var express = require('express');
var router = express.Router();
// New Code
var mongo = require('mongodb');
var monk = require('monk');
var config = require('../defaults');

var db = monk(config.mongo.uri + '/rotameeting-dev'); //monk('localhost:27017/nodetest1');

const bus = require('servicebus').bus({
	url: config.servicebus.uri + "?heartbeat=60"
});


console.log('MongoURI from config: ' + config.mongo.uri);
console.log('ServiceBusURI from config: ' + config.servicebus.uri);
console.log('Port from env: ' + process.env.PORT);


bus.listen('user.create', function (payload, o) {
	// Set our collection
	var collection = db.get('usercollection');
  let commandId = payload.commandId,
      data = payload.data;

  if(data.username && data.useremail) {
		// Submit to the DB
		collection.insert(data, function (err, doc) {
			if (err) {
				// If it failed, return error
				bus.send("user.create.response", { status: 400, commandId: commandId, payload: { type: "error", error: err } });
			}
			else {
				// And forward to success page
				bus.send("user.create.response", { status: 200, commandId: commandId, payload: doc });
			}
		});
	} else {
		bus.send("user.create.response", { status: 400, commandId: commandId, payload: { type: "error", error: "User must have username and useremail" } });
	}
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* GET Hello World page. */
router.get('/helloworld', function(req, res) {
  res.render('helloworld', { title: 'Hello, World!' });
});

/* GET Userlist page. */
router.get('/userlist', function(req, res) {
  var db = req.db;
  var collection = db.get('usercollection');
  collection.find({},{},function(e,docs){
    res.render('userlist', {
      "userlist" : docs
    });
  });
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
