const mongoose = require('mongoose');
const validator = require('validator');
const _ = require('lodash');

var PublisherSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true        
    },
    email: {
        type: String,
        trim: true,
        validate: {
            validator: validator.isEmail,
            message: '{VALUE} is not a valid email'
        },
    },
    facebook_url: {
        type: String
    }
});


// CustomerSchema.statics.nameInUse = function (email) {
//     var Customer = this
//     return Customer
//         .findOne({
//             name
//         })
//         .then(Publisher => Promise.reject())
//         .catch(error => Promise.resolve(true))
// }

var Publisher = mongoose.model('Publisher', PublisherSchema);

module.exports = {
    Publisher
}