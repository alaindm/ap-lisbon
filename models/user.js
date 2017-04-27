const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const bcrypt = require('bcryptjs');

var UserSchema = new mongoose.Schema({
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
  password: {
    type: String,
    require: true,
    minlength: 4
  },
  accessToken: {
    type: String,
    required: false
  },
  validationToken: {
    type: String,
    required: false
  },
  account_validation: {
    type: String
  },
  full_name: {
    type: String,
    required: false,
    minlength: 4
  },
  cpf: {
    type: Number,
    required: false
  },
  nickname: {
    type: String
  },
  facebook_url: {
    type: String
  },
  phone_number: {
    type: String,
    required: false
  },
  work_field: {
    type: String,
    required: false
  },
  creci: {
    type: String
  },
  crea: {
    type: String
  },
  address: {
    street: String,
    zip: Number,
    city: String,
    state: String,
    country: String
  },
  bank_account: {
    bank: String,
    branch: String,
    account_number: String
  },
  iban: {
    type: String
  },
  ip_address: {
    type: String
  },
  publisher: {
    type: String
  }
});

UserSchema.methods.toJSON = function () {
  var user = this;
  var userObject = user.toObject();

  return _.pick(userObject, ['_id', 'email']);
};

UserSchema.statics.emailInUse = function (email) {
  var User = this
  return User
          .findOne({email})
          .then(user => Promise.reject())
          .catch(error => Promise.resolve(true))
}

UserSchema.methods.generatePasswordToken = function () {
  var user = this;
  var token = jwt.sign({id: user._id.toHexString(), type: 'validation' , exp: Math.floor(new Date().getTime()/1000) + 60*60}, process.env.JWT_SECRET_PASSWORD).toString();
  user.validationToken = token
  return user.save().then(() => {
    return token;
  });
};

UserSchema.methods.generateAuthToken = function () {
  var user = this
  var token = jwt.sign({id: user._id.toHexString(), type: 'access'}, process.env.JWT_SECRET).toString();
  user.accessToken = token
  return user.save().then(() => {    
    return token;
  });
};

UserSchema.methods.validateAccount = function () {
  var user = this    
  user.account_validation = 'active'
  return user.save()
};

UserSchema.statics.checkExpirationToken = function(receivedToken) {
    var User = this
    var decoded
    try {
      decoded = jwt.verify(receivedToken, process.env.JWT_SECRET_PASSWORD);
    } catch (e) {  
      console.log(e)
      return Promise.reject(e);
    }
    var now = Math.floor(new Date().getTime()/1000)
    if(decoded.exp > now){       
      return Promise.resolve(decoded.id)
    } else {
      return Promise.resolve(false)
    }
}   

UserSchema.statics.findByToken = function (token) {
  var User = this;
  var decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return Promise.reject();
  }
  return User.findOne({
    '_id': decoded.id,
    'accessToken': token
  });
};

UserSchema.statics.findByCredentials = function (email, password) {
  var User = this;
  return User
          .findOne({email})
          .then((user) => {
            if (!user) {
              return Promise.reject();
            }
            return new Promise((resolve, reject) => {
              // Use bcrypt.compare to compare password and user.password
              bcrypt.compare(password, user.password, (err, res) => {
                if (res) {
                  resolve(user);
                } else {
                  reject();
                }
              });
            });
          })
          .catch(e => {
            console.log('User email not found in DB')
            return Promise.reject();
          })
};

UserSchema.pre('save', function (next) {
  var user = this;
  if (user.isModified('password')) {
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(user.password, salt, (err, hash) => {
        user.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});

UserSchema.pre('update', function (next) {
  var user = this; 
  console.log(user)   
  if (user.isModified('password')) {
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(user.password, salt, (err, hash) => {
        user.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});

var User = mongoose.model('User', UserSchema);

module.exports = {User}
