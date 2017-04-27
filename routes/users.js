var express = require('express')
var router = express.Router()
const _ = require('lodash')
var emailSend = require('../mailer')
var {authenticate} = require('../middleware/authenticate');
var {User} = require('../models/user');
const {ObjectID} = require('mongodb');
const handlebars = require('handlebars')
const fs = require('fs')
var pdf = require('html-pdf')
const {SHA256} = require('crypto-js');

router.use( function( req, res, next ) {
    // this middleware will call for each requested
    // and we checked for the requested query properties
    // if _method was existed
    // then we know, clients need to call DELETE request instead
    if ( req.query._method == 'DELETE' ) {
        // change the original METHOD
        // into DELETE method
        req.method = 'DELETE';
        // and set requested url to /user/12
        req.url = req.path;
    }       
    next(); 
});


// create action
router.post('/', (req, res, next) => {
  var userParams = _.pick(req.body, ['email', 'password'])
  userParams.ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  User
    .emailInUse(userParams.email)
    .then(validEmail => {
      var user = new User(userParams)      
      user
        .save()
        .then(()=>{          
          return user.generatePasswordToken()
        })
        .then(regToken => {          
          emailSend(userParams.email, "Golden Visa - Please activate your account", 'accountActivation', {token: regToken, firstName: userParams.email})       
          res.redirect(303, '/u/gotoemail')   
        })
        .catch(errors => {          
          if(errors.name == 'ValidationError'){            
            _.forIn(errors.errors, function(value, key) {
              req.flash('error', value.message)              
            });    
            res.locals.messages = req.flash()        
            res.render('register', req.body)                                    
          } else {
            req.flash('error', 'Erro no formulário. Revise seus dados.')
            res.locals.messages = req.flash()
            console.log(errors)
            console.log(req.body)
            res.render('register', req.body)
          }          
        })
    })
    .catch(emailAlreadyRegistered => {
      req.flash('error', 'E-mail already registered')
      res.redirect(303, '/register')
    })   
});

// Password recovery
router.get('/password', function(req, res, next) {
  res.render('passwordRecovery', { title: 'Password recovery' });
});

// User Auth
router.post('/login', function(req, res, next) {
  var params = _.pick(req.body, ['email', 'password']);
  User
    .findByCredentials(params.email, params.password)
    .then((user)=>{
      if(user.account_validation === 'active'){
        return user
                .generateAuthToken()
                .then(token => {
                  if(req.body.remember){
                    req.sessionOptions.maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days
                  }
                  req.session.token = token
                  req.session.li = true // logged in
                  res.redirect(303,'/broker')
                })
                .catch(e => {
                  req.flash('error', 'Internal server error')
                  res.redirect(303,'/')
                })
      } else{
        req.flash('error','Your account was not validated')
        res.redirect(303, '/u/recovery')
      }
    }) 
    .catch((e) => {
      req.flash('error', 'Invalid Login/Password combination')
      res.redirect(303,'/login')
    })
})

// Logout
router.get('/logout', authenticate, function(req, res, next){
  var userId = req.user._id  
  User
    .findOne({_id: userId})
    .then(user => {  
      user.accessToken = null
      user
        .save()        
        .then(() => {       
          req.session.li = false // li -> logged in   
          req.session = null
          req.user = null          
          res.redirect('/')
        }, (e) => {  
          console.log(e)        
          res.status(400).send();
        })
        .catch(e => {
          res.status(500).send()
        })
    })  
})

// activate account
router.get('/activation', (req, res, next) =>{
  var emailToken = req.query.token
  User
    .checkExpirationToken(emailToken)
    .then(userId => {
      if(userId){
        User
          .findOne({_id: userId, validationToken: emailToken})          
          .then(user => { 
              user
                .validateAccount()
                .then(user => user.generateAuthToken())                
                .then(token => {
                  req.session.token = token
                  req.session.li = true // li -> logged in                  
                  req.flash('success', 'Account Activated!')
                  res.redirect(303,'/broker')
                })              
            })
          .catch(e => {
            console.log(e)
            req.flash('error', 'Invalid activation link.')
            res.redirect(303, '/')
          })       
      } else {
        req.flash('error', 'Expiried link. Please contact the administrator.')
        res.redirect(303,'/')
      }    
    })
    .catch( e => {
      req.flash('error','Invalid or Expirated link.')
      res.redirect(303,'/')
    })
})

// Forgot Password page
router.get('/recovery', function(req, res, next){
  res.render('users/recovery')
})

// Send reset password token to email
router.post('/recovery', function(req, res){
  User
    .findOne({email: req.body.email})
    .then(user => {
      user
        .generatePasswordToken()
        .then(token => {
          emailSend(req.body.email, "Golden Visa - Password Reset request", 'passwordRecovery', {token: token, firstName: user.email})              
          res.render('users/gotoemail')   
        })
    })
    .catch(e => {
      req.flash('error', 'E-mail not registered.')
      res.redirect(303, '/users/recovery')
    })
})

// set new password - recovery process
router.get('/password_reset', function(req, res) {
  var emailToken = req.query.token
  User
    .checkExpirationToken(emailToken)
    .then(userId => {
      if(userId){
        User
          .findOne({_id: userId, validationToken: emailToken})
          .then(user => {
              req.session.password_token = emailToken 
              res.render('users/password_reset')              
            })
          .catch(e => {
            req.flash('error', 'Invalid password link.')
            res.redirect(303, '/')
          })       
      } else {
        req.flash('error', 'Expiried link. Please contact the administrator.')
        res.redirect(303,'/')
      }    
    })
    .catch( e => {
      req.flash('error','Invalid or Expirated link.')
      res.redirect(303,'/')
    })
})

// change password - recovery process
router.post('/password_reset', function(req, res) {
  var emailToken = req.session.password_token
  // if(req.body.password === req.body.password_confirmation){  
    User
    .checkExpirationToken(emailToken)
    .then(userId => {
      if(userId){
        User
          .findOne({_id: userId, validationToken: emailToken})
          .then(user => {
            user.password = req.body.password
            user.account_validation = 'active'
            user
              .save()
              .then(user => {            
                user
                  .generateAuthToken()
                  .then(token => {
                    if(req.body.remember){
                      req.sessionOptions.maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days
                    }                
                    req.session.token = token
                    req.session.li = true
                    res.redirect(303,'/broker')
                  })
                  .catch(e => {
                    req.flash('error', 'Internal server error')
                    res.redirect(303,'/')
                  })                  
                })
              .catch(e => {
                req.flash('error', 'Invalid password link.')
                res.redirect(303, '/')
              })
          })        
      } else {
        req.flash('error', 'Expiried link. Please contact the administrator.')
        res.redirect(303,'/')
      }    
    })
    .catch( e => {
      req.flash('error','Invalid or Expirated link.')
      res.redirect(303,'/')
    })
  // } else {
  //   req.flash('error', 'Passwords do not match')
  //   res.render('/users/password_reset')
  // }
})

// delete confirmation page
router.get('/delete-user', authenticate, (req, res) => {  
  res.render('users/delete', {id: req.user._id})
});

// destroy action
router.delete('/:id', authenticate, function(req, res, next) {
  if(req.params.id  === req.user._id.toString()){
    User
      .findOneAndRemove({
        _id: req.user._id,
        accessToken: req.session.token
      })
      .then(()=>{
        req.flash('success', 'User was removed')
        res.redirect(303,'/')
      })
  } else {
    req.flash('error', 'Invalid request')
    res.redirect(303, '/broker')
  }
});

// edit form
router.get('/:id/edit', authenticate, function(req, res, next) {  
  res.render('users/edit', req.user)
  console.log(req.user)  
});

// // show content
// router.get('/:id'), authenticate, function(req, res, next) {
//   res.render('users/show')
// }

// update action
router.post('/:id', authenticate, function(req, res, next) {
    if(req.params.id  === req.user._id.toString()){
    User
      .findOne({
      _id: req.user._id,
      accessToken: req.session.token
      })
      .then(user=>{
      user.email = req.user.email
      user.full_name = req.body.full_name
      user.save().then(()=>{
        req.flash('success', 'User data was updated')
        res.redirect('/broker')
      })
      .catch(e=>{
        req.flash('error', e)
        res.locals.messages = req.flash
        res.render('users/edit', req.body)
      })      
    })
  } else {
    req.flash('error', 'Invalid request')
    res.redirect(303, '/broker')
  }
});

router.get('/gotoemail', (req, res)=>{
  res.render('users/gotoemail') 
})

router.get('/contracts', authenticate, (req, res)=>{
  User
    .findOne({_id: req.user._id})
    .then(user => {
      var ramdomString = SHA256(JSON.stringify(user._id) + process.env.PARTNERSHIP_CONTRACT_SECRET).toString()
      fs.readFile('views/users/partnershipContract.hbs', 'utf-8', function(error, source){        
        var template = handlebars.compile(source);
        var html = template(user);
        var options = { format: 'A4' };        
        pdf.create(html, options).toFile(`./views/partnershipContracts/${ramdomString}.pdf`, function(err, resp) {          
          if (err) return console.log(err);
          setTimeout(function(){

            fs.unlink(`views/partnershipContracts/${ramdomString}.pdf`, (err) => {
            if (err) throw err;
            console.log(`successfully deleted ${resp.filename}`);
            })
            },1*60*1000)
          return
        })
      })
      return ramdomString
    })
    .catch(error => {
      // console.log(error)
      req.flash('error', 'Falha no processamento do contrato')
      res.redirect(303, '/broker')
    })
    .then((ramdomString) => {      
      console.log(ramdomString)
      res.render('users/contracts', {id: ramdomString})
    })
    .catch(error => {
      console.log(error)
      req.flash('error', 'Ocorreu um erro')
      res.redirect(303, '/broker')
    })
})
  


module.exports = router;