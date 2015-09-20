'use strict';

// Production specific configuration
// ==================================
//noinspection JSUnresolvedVariable
module.exports = {
	// MongoDB connection options
	mongo: {
		uri: process.env.MONGOLAB_URI || 'mongodb://localhost/rotameeting-dev',
	},
	servicebus: {
		uri: process.env.SERVICEBUS_URI || 'amqp://localhost:5672'
	},
	port: process.env.PORT || 8080
};
