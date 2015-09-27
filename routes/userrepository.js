var Promise = require('bluebird');
var sourcedRepoMongo = require('sourced-repo-mongo');
var MongoRepository  = sourcedRepoMongo.Repository;
var User = require('./userentity');
var util = require('util');

function UserRepository () {
	this.cache = {};
	MongoRepository.call(this, User);
}

util.inherits(UserRepository, MongoRepository);

UserRepository.prototype.get = function (id, cb) {
	var self = this;
	var promise = new Promise(function (resolve, reject) {
		var user = self.cache[id];
		if(!user) {
			// rebuild from event snapshots and store
			UserRepository.super_.prototype.get.call(self, id, function (err, user) {
				self.cache[id] = user;
				resolve(user);
			});
		} else {
			resolve(user);
		}
	});

	promise.done(function (user) {
		cb(null, user);
	});
};

module.exports = UserRepository;