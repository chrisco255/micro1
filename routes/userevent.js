var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserEventSchema = new Schema({
	event: String,
	data: {}
});

module.exports = UserEventSchema;