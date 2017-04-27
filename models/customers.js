const mongoose = require('mongoose');
const validator = require('validator');
const _ = require('lodash');

var CustomerSchema = new mongoose.Schema({
    cpf: {
        type: String,
        required: true,
        unique: true        
    },
    full_name: {
        type: String,
        required: false,
        minlength: 4
    },
    spouse: {
        type: String
    },
    phone_number1: {
        type: String,
        required: false
    },
    phone_number2: {
        type: String,
        required: false
    },
    email1: {
        type: String,
        trim: true,
        validate: {
            validator: validator.isEmail,
            message: '{VALUE} is not a valid email'
        },
    },
    email2: {
        type: String,
        required: false,
        trim: true,
        validate: {
            validator: validator.isEmail,
            message: '{VALUE} is not a valid email'
        }
    },
    skype: {
        type: String
    },    
    facebook_url: {
        type: String
    },
    address: {
        street: String,
        zip: Number,
        city: String,
        state: String,
        country: String
    },
    nationality1: {
        type: String
    },
    nationality2: {
        type: String
    },
    time_to_contact: {
        type: String
    },    
    work_field: {
        type: String,
        required: false
    },
    company: {
        type: String
    },
    government_employee: {
        type: Boolean
    },
    interests: {
        type: String
    },
    property_value: {

    },
    golden_visa: {
        type: Boolean
    },
    city_of_interest: {
        
    },
    investment_profile:{

    },
    property_type: {

    },
    financing_needed: {
        type: Boolean
    },
    amount_available: {
        type: Number
    },
    customer_informed: {
        type: Boolean
    },
    broker_ip_address: {
        type: String
    },
    _creator: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  }
});

// CustomerSchema.methods.toJSON = function () {
//     var Customer = this;
//     var CustomerObject = Customer.toObject();

//     return _.pick(CustomerObject, ['_id', 'email']);
// };


CustomerSchema.statics.emailInUse = function (email) {
    var Customer = this
    return Customer
        .findOne({
            email
        })
        .then(Customer => Promise.reject())
        .catch(error => Promise.resolve(true))
}




CustomerSchema.statics.findByCredentials = function (email, password) {
    var Customer = this;
    return Customer
        .findOne({
            email
        })
        .then((Customer) => {
            if (!Customer) {
                return Promise.reject();
            }
            return new Promise((resolve, reject) => {
                // Use bcrypt.compare to compare password and Customer.password
                bcrypt.compare(password, Customer.password, (err, res) => {
                    if (res) {
                        resolve(Customer);
                    } else {
                        reject();
                    }
                });
            });
        })
        .catch(e => {
            console.log('Customer email not found in DB')
            return Promise.reject();
        })
};





var Customer = mongoose.model('Customer', CustomerSchema);

module.exports = {
    Customer
}