'use strict';

/********************************
 Dependencies
 ********************************/
var mongoose = require('mongoose');

/********************************
 Create Need Schema
 ********************************/
var needSchema = new mongoose.Schema({
    phone: {type: String, required: true},
    city: {type: String, required: false},
    county: {type: String, required: false},
    state: {type: String, required: false},
    receivedAt: {type: Date, required: true},
    need: {type: String, required: true},
    source: {type: String, required: false},
    category: {type: String, required: true}
});

module.exports = mongoose.model('Need', needSchema);
