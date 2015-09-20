'use strict';

// Production specific configuration
// ==================================
//noinspection JSUnresolvedVariable
module.exports = {
	// MongoDB connection options
	mongo: {
		uri: process.env.MONGOLAB_URI
	},
	servicebus: {
		uri: process.env.SERVICEBUS_URI
	},
	port: process.env.PORT || 8080
};
