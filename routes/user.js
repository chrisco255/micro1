var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
	name: String,
	email: { type: String, lowercase: true }
});

module.exports = UserSchema;