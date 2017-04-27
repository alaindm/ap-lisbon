var express = require('express');
var router = express.Router();
const _ = require('lodash');
var {authenticate} = require('../middleware/authenticate');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('login')
});

// Register new user
router.get('/register', function(req, res, next) {  
  res.render('register', { title: 'Register', css: ['register.css']});
});

// User Login Page
router.get('/login', function(req, res, next) {
  res.render('login', { title: 'Login'});
});

// Privacy Policy
router.get('/pp', function(req, res, next) {
  res.render('pp', { title: 'Política de Privacidade'});
});

// Terms of Use
router.get('/tos', function(req, res, next) {  
  res.render('tos', { title: 'Termos de Uso' });  
});

// About or Contact page
router.get('/about', function(req, res, next) {
  res.render('about', { title: 'Contato' });
});

// User(Broker) menu
router.get('/broker', authenticate, function(req, res, next) {   
  res.render('broker', {id: (req.user._id), css:['broker.css']});
});

// FAQ 
router.get('/how', function(req, res, next) {     
  res.render('how');
});

// Contrato Padrão
router.get('/contract', function(req, res, next) {   
  res.render('contract');
});

// Publisher SHOW 
router.get('/divulgador', function(req, res, next) {
  // var publisherName = req.params.publisherName;
  res.render('divulgador', { title: 'Divulgador' });
});

module.exports = router
