var express = require('express')
var router = express.Router()
const _ = require('lodash')
var emailSend = require('../mailer')
var {authenticate} = require('../middleware/authenticate');
var {adminAuth} = require('../middleware/adminAuth');
var {User} = require('../models/user');
var {Publisher} = require('../models/publishers');
var {Customer} = require('../models/customers');
const {ObjectID} = require('mongodb');
const handlebars = require('handlebars')
const fs = require('fs')
var pdf = require('html-pdf')
const {SHA256} = require('crypto-js');
const moment = require('moment')

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

router.get('/index', authenticate, function(req, res, next) {
  Publisher
    .findOne({email: req.user.email})
    .then(publisher => {  
      User
        .find({source: publisher.username})        
        .then(user => {          
          res.render('users/index', {title: 'Parceiros cadastrados', user});
        })
        .catch(error => {
          req.flash('error', 'Erro interno')
          res.redirect(303, '/brokers')
        }) 
    })
    
        
});


router.get('/gotoemail', (req, res)=>{
  res.render('users/gotoemail', { title: 'Abra seu e-mail', desc: 'Usuário deve ir a sua caixa de e-mail', robots: 'NOINDEX, NOFOLLOW'})
})

// create action
router.post('/', (req, res, next) => {
  var userParams = _.pick(req.body, ['email', 'password', 'full_name', 'cpf', 'nickname', 'facebook_url', 'phone_number', 'work_field', 'creci', 'crea', 'address.street', 'address.zip', 'address.city', 'address.state', 'address.zip', 'address.country', 'bank_account.bank', 'bank_account.branch', 'bank_account.account_number', 'iban', 'source'])  
  userParams.ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  User
    .emailInUse(userParams.email)
    .then(() => {
      var user = new User(userParams)            
      user.save()     
      .then(user =>{
        // emailSend('fbexiga@remax.pt', "Parceiro Cadastrado | Apartamentos em Lisboa", 'userRegistration', {user})   
        emailSend('fbexiga@remax.pt', "Parceiro Cadastrado | Apartamentos em Lisboa", 'userRegistration', {user})           
        return user.generatePasswordToken()
      })
      .then(regToken => {          
        emailSend(userParams.email, "ApartamentosEmLisboa.com - Validação de conta", 'accountActivation', {token: regToken, firstName: user.full_name})   
        res.redirect(303, '/u/gotoemail')   
      })
    })    
    .catch(errors => {    
      console.log(errors)      
      if(errors.name == 'ValidationError'){            
        _.forIn(errors.errors, function(value, key) {
          req.flash('error', value.message)              
        });    
        res.locals.messages = req.flash()        
        res.render('register', {title: 'Cadastro de Usuário', user: req.body, robots: 'NOINDEX, NOFOLLOW', ref: req.body.source })               
      }
      if(errors === 'inUse'){        
        req.flash('error', 'E-mail já registrado.')
        res.locals.messages = req.flash() 
        res.render('register', {title: 'Cadastro de Usuário', user: userParams, robots: 'NOINDEX, NOFOLLOW', ref: req.body.source})
      } else {
        console.log(errors)
        req.flash('error', 'Erro no formulário. Revise seus dados.')
        res.locals.messages = req.flash()            
        res.render('register', {title: 'Cadastro de Usuário', user: req.body, robots: 'NOINDEX, NOFOLLOW', ref: req.body.source})
      }          
    }) 

    // .then(validEmail => {
    //   var user = new User(userParams)            
    //   user
    //     .save()
    //     .then(()=>{
    //       emailSend('fbexiga@remax.pt', "Parceiro Cadastrado | Apartamentos em Lisboa", 'userRegistration', {user})             
    //       return user.generatePasswordToken()
    //     })
    //     .then(regToken => {          
    //       emailSend(userParams.email, "ApartamentosEmLisboa.com - Validação de conta", 'accountActivation', {token: regToken, firstName: user.full_name})   
    //       res.redirect(303, '/u/gotoemail')   
    //     })
    //     .catch(errors => {          
    //       if(errors.name == 'ValidationError'){            
    //         _.forIn(errors.errors, function(value, key) {
    //           req.flash('error', value.message)              
    //         });    
    //         res.locals.messages = req.flash()        
    //         res.render('register', {title: 'Cadastro de Usuário', user: req.body, robots: 'NOINDEX, NOFOLLOW', ref: req.body.source })                                
    //       } else {
    //         console.log(errors)
    //         req.flash('error', 'Erro no formulário. Revise seus dados.')
    //         res.locals.messages = req.flash()            
    //         res.render('register', {title: 'Cadastro de Usuário', user: req.body, robots: 'NOINDEX, NOFOLLOW', ref: req.body.source})
    //       }          
    //     })
    // })
    // .catch(emailAlreadyRegistered => {           
    //   req.flash('error', 'E-mail já registrado.')
    //   res.locals.messages = req.flash() 
    //   res.render('register', {title: 'Cadastro de Usuário', user: req.body, robots: 'NOINDEX, NOFOLLOW', ref: req.body.source})
    // })       
});

// Password recovery
router.get('/password', function(req, res, next) {
  res.render('passwordRecovery', { title: 'Recuperação de Senha', desc: 'Se o usuário esqueceu a senha, aqui ele pode recuperar o acesso', robots: 'NOINDEX, NOFOLLOW'})
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
                  console.log(e)                 
                  req.flash('error', 'Erro do servidor.')                  
                  res.redirect(303,'/')
                })
      } else{
        req.flash('error','Sua conta não foi validada.')
        res.redirect(303, '/u/recovery')
      }
    }) 
    .catch((e) => {
      req.flash('error', 'Usuário/Senha incorretos.')    
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

router.get('/contracts', authenticate, (req, res)=>{
  User
    .findOne({_id: req.user._id})
    .then(user => {
      moment.locale('pt-BR')
      user.date = moment().format('LL')
      var pdfString = user.cpf + (SHA256(JSON.stringify(user._id) + process.env.PARTNERSHIP_CONTRACT_SECRET).toString()).slice(5,11)
      fs.readFile('views/users/partnershipContract.hbs', 'utf-8', function(error, source){        
        var template = handlebars.compile(source);
        var html = template(user);
        var options = { 
          format: 'A4',
          "border": {
            "top": "0.5in", // default is 0, units: mm, cm, in, px 
            "right": "0.5in",
            "bottom": "0.5in",
            "left": "0.3in"
          },
          // "header": {
              // "height": "5mm",
              // "contents": '<div style="text-align: center;">CONTRATO DE PARCERIA</div>'
          // }
        };        
        pdf.create(html, options).toFile(`./views/partnershipContracts/${pdfString}.pdf`, function(err, resp) {          
          if (err) return console.log(err);
          setTimeout(function(){

            fs.unlink(`views/partnershipContracts/${pdfString}.pdf`, (err) => {
            if (err) throw err;
            console.log(`successfully deleted ${resp.filename}`);
            })
            },1*60*1000)
          return
        })
      })
      return pdfString
    })
    .catch(error => {
      console.log(error)
      req.flash('error', 'Falha no processamento do contrato')
      res.redirect(303, '/broker')
    })
    .then((ramdomString) => {      
      console.log(ramdomString)
      res.render('users/contracts', {id: ramdomString, title: 'Meu Contrato de Parceria', robots: 'NOINDEX, NOFOLLOW'})
    })
    .catch(error => {
      console.log(error)
      req.flash('error', 'Ocorreu um erro')
      res.redirect(303, '/broker')
    })
})
// activate account
// router.get('/activation', (req, res, next) =>{
//   var emailToken = req.query.token
//   User
//     .checkExpirationToken(emailToken)
//     .then(userId => {
//       if(userId){
//         User
//           .findOne({_id: userId, validationToken: emailToken})          
//           .then(user => { 
//               user
//                 .validateAccount()
//                 .then(user => user.generateAuthToken())                
//                 .then(token => {
//                   req.session.token = token
//                   req.session.li = true // li -> logged in                  
//                   // req.flash('success', 'Account Activated!')
//                   res.redirect(303,'/u/activated')
//                 })              
//             })
//           .catch(e => {
//             console.log(e)
//             req.flash('error', 'Link de ativação inválido.')
//             res.redirect(303, '/')
//           })       
//       } else {
//         req.flash('error', 'Link expirado. Por favor, contate o administrador do sistema.')
//         res.redirect(303,'/')
//       }    
//     })
//     .catch( e => {
//       req.flash('error','Link inválido ou expirado.')
//       res.redirect(303,'/')
//     })
// })

router.get('/activation', (req, res, next) =>{
  var emailToken = req.query.token
  User
    .checkExpirationToken(emailToken)
    .catch( e => {
      req.flash('error','Link inválido.')
      res.redirect(303,'/')
    })
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
                  // req.flash('success', 'Account Activated!')
                  res.redirect(303,'/u/activated')
                })              
            })
          .catch(e => {
            console.log(e)
            req.flash('error', 'Link de ativação inválido.')
            res.redirect(303, '/')
          })       
      } else {
        req.flash('error', 'Link expirado. Por favor, contate o administrador do sistema.')
        res.redirect(303,'/')
      }    
    })    
})

router.get('/activated', authenticate, (req, res) => {
  res.render('users/activated', { title: 'Conta Ativada', desc: 'Conta de usuário ativada', robots: 'NOINDEX, NOFOLLOW'})
})

// Forgot Password page
router.get('/recovery', function(req, res, next){
  res.render('users/recovery', { title: 'Recuperação de Senha', desc: 'Recuperação de Senha', robots: 'NOINDEX, NOFOLLOW'})
})

// Send reset password token to email
router.post('/recovery', function(req, res){
  User
    .findOne({email: req.body.email})
    .then(user => {
      user
        .generatePasswordToken()
        .then(token => {
          emailSend(req.body.email, "Apartamentos Em Lisboa", 'passwordRecovery', {token: token, firstName: user.full_name})              
          res.render('users/gotoemail', { title: 'Abra seu e-mail', desc: 'Usuário deve ir a sua caixa de e-mail', robots: 'NOINDEX, NOFOLLOW'})
        })
        .catch(e => {
          console.log(e)
          req.flash('error', 'Usuário não encontrado.')
          res.redirect(303, '/login')
        })
    })
    .catch(e => {
      req.flash('error', 'E-mail não registrado.')
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
              res.render('users/password_reset', { title: 'Cadastro de nova senha', robots: 'NOINDEX, NOFOLLOW'})             
            })
          .catch(e => {
            req.flash('error', 'Invalid password link.')
            res.redirect(303, '/')
          })       
      } else {
        req.flash('error', 'Link expirado.')
        res.redirect(303,'/')
      }    
    })
    .catch( e => {
      req.flash('error','Link inválido ou expirado.')
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
                    req.flash('error', 'Erro interno no servidor.')
                    res.redirect(303,'/')
                  })                  
                })
              .catch(e => {
                req.flash('error', 'Link de senha inválido.')
                res.redirect(303, '/')
              })
          })        
      } else {
        req.flash('error', 'Link expirado.')
        res.redirect(303,'/')
      }    
    })
    .catch( e => {
      req.flash('error','Link inválido ou expirado.')
      res.redirect(303,'/')
    })
  // } else {
  //   req.flash('error', 'Passwords do not match')
  //   res.render('/users/password_reset')
  // }
})

// delete confirmation page
router.get('/delete-user', authenticate, (req, res) => {  
  res.render('users/delete', {id: req.user._id, title: 'Deletar conta de usuário', robots: 'NOINDEX, NOFOLLOW'})
});

// destroy action
router.delete('/:id', authenticate, function(req, res, next) {
  if(req.params.id  === req.user._id.toString()){
    User
      // .findOneAndRemove({
      //   _id: req.user._id,
      //   accessToken: req.session.token
      // })
      .findOne({
        _id: req.user._id,
        accessToken: req.session.token
      })
      .then(user => {
        user.email_deleted= user.email
        user.email = user.email_deleted + 'DELETED'
        user.accessToken = null
        user.account_validation = 'deleted'
        req.session = null
        req.user = null
        user.save()          
      })
      .then(()=>{
        req.flash('success', 'Usuário foi removido.')
        res.redirect(303,'/')
      })
      .catch(error => {
        req.flash('error', 'Error interno. Contate o administrador.')
        res.redirect(303, '/broker')
      })
  } else {
    req.flash('error', 'Invalid request')
    res.redirect(303, '/broker')
  }
});

// edit form
router.get('/:id/edit', authenticate, function(req, res, next) {   
  res.render('users/edit', { user: req.user, title: 'Editar dados da conta', robots: 'NOINDEX, NOFOLLOW'})    
});

// view profile (only Admin)
router.get('/:id', adminAuth, function(req, res, next) {   
  User
    .findById(req.params.id)
    .then(user => {
      res.render('users/show', { user, title: 'Informações de Parceiro', robots: 'NOINDEX, NOFOLLOW'}) 
    })
    .catch(error => {
      req.flash('error', 'Usuário não encontrado')
      res.redirect(303, '/admin')
    })     
});

// customer list per user (for admins)
router.get('/:id/customers', adminAuth, function(req, res, next) {
  Customer
    .find({_creator: req.params.id}, 'full_name')
    .sort('full_name')
    .then(customers => {
      // res.send(customers)
      res.render('customers/index-admin', {title: 'Clientes cadastrados', customers});
    })
    .catch(error => {
      req.flash('error', 'Erro interno')
      res.redirect(303, '/admin')
    }) 
});

// // show content
// router.get('/:id'), authenticate, function(req, res, next) {
//   res.render('users/show')
// }

// update action
router.post('/:id', authenticate, function(req, res, next) {
    if(req.params.id  === req.user._id.toString()){
    var userParams = _.pick(req.body, ['email', 'full_name', 'nickname', 'facebook_url', 'phone_number', 'work_field', 'creci', 'crea', 'address.street', 'address.zip', 'address.city', 'address.state', 'address.ziṕ', 'address.country', 'bank_account.bank', 'bank_account.branch', 'bank_account.account_number', 'iban'])  
    User
      .findOne({
      _id: req.user._id,
      accessToken: req.session.token
      })
      .then(user=>{      
      user.address.city = userParams['address.city']
      user.address.street = userParams['address.street']
      user.address.zip = userParams['address.zip']
      user.address.state = userParams['address.state']
      user.address.country = userParams['address.country']
      user.bank_account.bank = userParams['bank_account.bank']
      user.bank_account.branch = userParams['bank_account.branch']
      user.bank_account.account_number = userParams['bank_account.account_number']
      user.iban = req.body.iban 
      user.update({email: req.body.email, full_name: req.body.full_name, nickname: req.body.nickname, facebook_url: req.body.facebook_url, phone_number: req.body.phone_number, work_field: req.body.work_field, creci: req.body.creci, crea: req.body.crea })   
      user.save().then(()=>{
        req.flash('success', 'Dados foram atualizados.')
        res.redirect('/broker')
      })
      .catch(e=>{
        req.flash('error', 'e')
        res.locals.messages = req.flash
        res.render('users/edit', {user: req.body, title: 'Editar dados da conta', robots: 'NOINDEX, NOFOLLOW'})
      })      
    })
  } else {
    req.flash('error', 'Requisição inválida.')
    res.redirect(303, '/broker')
  }
});




module.exports = router;