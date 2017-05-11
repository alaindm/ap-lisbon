var express = require('express');
var router = express.Router();
const _ = require('lodash')
var {authenticate} = require('../middleware/authenticate');
var {adminAuth} = require('../middleware/adminAuth');
var {Customer} = require('../models/customers');
const {ObjectID} = require('mongodb');

// index list
router.get('/', authenticate, function(req, res, next) {
  Customer
    .find({_creator: req.user._id}, 'full_name')
    .sort('full_name')
    .then(customers => {
      // res.send(customers)
      res.render('customers/index', {title: 'Clientes cadastrados', customers});
    })
    .catch(error => {
      req.flash('error', 'Erro interno')
      res.redirect(303, '/brokers')
    }) 
});


// create form
router.get('/new', authenticate, function(req, res) {  
  res.render('customers/new', {title: 'Novo Cliente'});
});

// create action
router.post('/', authenticate, function(req, res, next) {  
  var ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  var customerParams = _.pick(req.body, ['cpf', 'full_name', 'spouse', 'phone_number', 'phone_number2', 'email1', 'email2', 'skype', 'address.street', 'address.city', 'address.state','address.country', 'nationality1', 'nationality2', 'time_to_contract', 'work_field', 'company', 'government_employee', 'interests', 'golden_visa', 'city_of_interest', 'investment_profile', 'property_type', 'financing_needed', 'amount_available', 'customer_informed'])
  customerParams.broker_ip_address = ip_address
  customerParams._creator = req.user._id    
  var customer = new Customer(customerParams)
  customer
    .save()
    .then(customer => {
      req.flash('success', 'Cliente cadastrado com sucesso!')
      res.redirect(303, '/broker')
    })
    .catch(errors => {
      console.log(errors)
      if(errors.name == 'ValidationError'){            
        _.forIn(errors.errors, function(value, key) {
          req.flash('error', value.message)              
        });    
        res.locals.messages = req.flash()        
        res.render('customers/new', { customer: req.body, title: 'Cadastrar novo cliente', robots: 'NOINDEX, NOFOLLOW'})                                   
      } else {
        req.flash('error', 'Erro no formulário. Revise seus dados.')
        res.locals.messages = req.flash()
        console.log(errors)
        console.log(req.body)
        res.render('customers/new', { customer: req.body, title: 'Cadastrar novo cliente', robots: 'NOINDEX, NOFOLLOW'})
      }      
    })
          

});

// // edit form
// router.get('/:id/edit', function(req, res, next) {  
//   res.redirect('/')
// });

// show content
router.get('/:id', authenticate, function(req, res, next) {    
  var customerId = req.params.id
  Customer
    .findOne({_id: customerId})
    .then(customer => {
      if (customer._creator.toString() === req.user._id.toString()) {
        res.render('customers/show', {title: `Informações de ${customer.full_name}`, customer})
      } else {
      res.locals.flash = req.flash('error', 'Não autorizado')
      res.redirect(303, '/broker')
      }
    })
    .catch(error => {
      console.log(error)
      req.flash('error', 'Usuário não existe')
      res.redirect(303, '/broker')
    })
});

// show content by user (for admins)
router.get('/:id/admin', adminAuth, function(req, res, next) {    
  var customerId = req.params.id
  Customer
    .findOne({_id: customerId})
    .then(customer => {      
        res.render('customers/show', {title: `Informações de ${customer.full_name}`, customer})      
    })
    .catch(error => {
      console.log(error)
      req.flash('error', 'Usuário não existe')
      res.redirect(303, '/admin')
    })
});

// // update action
// router.post('/:id', function(req, res, next) {  
//   res.redirect('/')
// });

// // destroy action
// router.delete('/:id', function(req, res, next) {
//   var username = req.params.username;
//   res.render('admin/index', {
//     title: 'Admin Login'
//   });
// });

module.exports = router;