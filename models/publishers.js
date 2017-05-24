const mongoose = require('mongoose');
const validator = require('validator');
const _ = require('lodash');

var PublisherSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        unique: true,
        validate: {
            validator: validator.isEmail,
            message: '{VALUE} não é um e-mail válido.'
        }
    },
    // password: {
    //     type: String,
    //     require: true,
    //     minlength: 4,
    //     validate: {
    //         validator: (v) => validator.isLength(v, {min:4, max:15}),
    //         message: 'Senha precisa ter no mínimo 4 caracteres.'
    //     }
    // },
    // accessToken: {
    //     type: String,
    //     required: false
    // },
    // full_name: {
    //     type: String,
    //     required: true,
    //     minlength: 3,
    //     validate: {
    //     validator: (v) => validator.isLength(v, {min:4, max:150}),
    //     message: 'Nome Completo precisa ter no mínimo 4 caracteres.'
    //     }
    // },
    // id: {
    //     type: String,
    //     required: true,
    //     validate: {
    //         validator: (v) => validator.isLength(v, {min:11, max:15}),
    //         message: 'Informação inválida.'
    //         }
    // },
    // phone_number: {
    //     type: String,
    //     required: false,
    //     validate: {
    //     validator: (v) => validator.isLength(v, {max:20}),
    //     message: 'Telefone não pode ter mais do que 20 caracteres.'
    //     }
    // },
    // address: {
    //     street: String,
    //     zip: String,
    //     city: String,
    //     state: String,
    //     country: String
    // },
    username_deleted: {
        type: String
    }
})


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