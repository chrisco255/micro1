var Entity = require('sourced').Entity;
var util = require('util');

function User() {
	this.id = null;
	this.username = "";
	this.email = "";
	Entity.call(this);
}

util.inherits(User, Entity);

User.prototype.initialize = function(id, cb) {
	this.id = id;
	if(cb) cb();
};

module.exports = User;