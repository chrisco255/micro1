'use strict';
const config = require('../config/defaults');
const bus = require('servicebus').bus({
	url: config.servicebus.uri + "?heartbeat=60"
});
const uuid = require('node-uuid');

module.exports = class CBBus {
	static createQueue(options) {
		const callbacks = {};
		const queueName = options.queueName,
					expectResponse = options.expectResponse;

		if(expectResponse) {
			bus.listen(`${queueName}.response`, function(msg) {
				//retrieve corresponding callback
				var cb = callbacks[msg.reqId];
				if(typeof cb !== 'function') return;
				cb(msg);
				//delete callback so they do not accrue in memory
				//TODO: should timestamp these and garbage collect over time
				delete callbacks[msg.reqId];
			});
		}

		function send(msg, cb) {
			let reqId = uuid.v4();
			msg.reqId = reqId;
			callbacks[reqId] = cb;
			bus.send(queueName, msg);
		}

		function listen(cb) {
			bus.listen(queueName, cb);
		}

		function sendResponse(msg) {
			bus.send(`${queueName}.response`, msg);
		}

		if(expectResponse) {
			return {
				send
			};
		}
		return {
			listen,
			sendResponse
		}
	}
}