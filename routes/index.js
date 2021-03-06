var express = require('express');
var router = express.Router();
const _ = require('lodash');
var {authenticate} = require('../middleware/authenticate');
const {Publisher} = require('../models/publishers');

/* GET home page. */
router.get('/', function(req, res, next) {
  if (res.locals.isLoggedIn) {
    res.render('broker', { title: 'Menu do Parceiro', desc: 'Entrar/Login', robots: 'NOINDEX, NOFOLLOW'})
  } else {
    res.render('login', { title: 'Apartamentos em Lisboa - Parceiros', desc: 'Entrar/Login', robots: 'NOINDEX, NOFOLLOW'})
  }  
});

// Register new user
router.get('/register', function(req, res, next) {
  var divSource = req.query.ref || req.session.ref  
  res.render('register', { title: 'Register', desc: 'Cadastro de novo usuário', robots: 'NOINDEX, NOFOLLOW', ref: divSource});
});

// User Login Page
router.get('/login', function(req, res, next) {
  res.render('login', { title: 'Entrar', desc: 'Entrar/Login', robots: 'NOINDEX, FOLLOW'})
});

// Privacy Policy
router.get('/pp', function(req, res, next) {
  res.render('pp', { title: 'Política de Privacidade', desc: 'Política de Privacidade do website e como utilizamos as informações dos usuáriso e visitantes', robots: 'NOINDEX, NOFOLLOW'})
});

// Terms of Use
router.get('/tos', function(req, res, next) {  
  res.render('tos', { title: 'Termos do Serviço', desc: 'Como funciona o serviço do nosso website', robots: 'NOINDEX, NOFOLLOW'})
});

// About or Contact page
router.get('/about', authenticate, function(req, res, next) {
  res.render('about', { title: 'Quem somos', desc: 'Os responśaveis pelo website', robots: 'NOINDEX, FOLLOW'})
});

// User(Broker) menu
router.get('/broker', authenticate, function(req, res, next) {   
  res.render('broker', {id: (req.user._id), isPublisher: (req.user.isPublisher), css:['broker.css'], title: 'Menu do Parceiro', desc: 'Opções para o corretor parceiro', robots: 'NOINDEX, FOLLOW'});
});

// FAQ 
router.get('/faq', authenticate, function(req, res, next) {     
  res.render('faq', { title: 'Perguntas Frequentes', desc: 'Dúvidas frequentes sobre o Apartamentos em Lisboa', robots: 'INDEX, FOLLOW'})
})

// Modelo de Negócio
router.get('/como-funciona', authenticate, function(req, res, next) {     
  res.render('como-funciona', { title: 'Como funciona?', desc: 'Como funciona o modelo de negócio do website Apartamentos em Lisboa', robots: 'INDEX, FOLLOW'})
})

// Links úteis
router.get('/links', authenticate, function(req, res, next) {     
  res.render('links', { title: 'Links úteis', desc: 'Links úteis ao corretor parceiros a respeito de imóveis em Portugal', robots: 'INDEX, FOLLOW'})
})

// Contrato Padrão
router.get('/contract', authenticate, function(req, res, next) {   
  res.render('contract', { title: 'Contrato de Parceria', desc: 'Criar contrato de parceria', robots: 'NOINDEX, FOLLOW'})
})

// Publisher SHOW 
router.get('/divulgador-exemplo', function(req, res, next) {
  req.session.ref = 'divulgador-exemplo'
  res.render('divulgador-exemplo', { ref: 'divulgador-exemplo', title: 'Página de Exemplo do Divulgador', desc: 'Divulgador-exemplo é um parceiro do apartamentosemlisboa.com . Aqui o corretor pode se cadastrar para indicar um cliente e direciona-lo a um corretor em Portugal', robots: 'INDEX, FOLLOW'});
})

router.get('/:id', (req, res) => {
  req.session.ref = req.params.id
  Publisher
    .findOne({username: req.params.id})
    .then(publisher => {
      if(publisher === null){
        req.flash('warn', 'Página não encontrada')        
        return res.redirect(303, '/')
      }
      res.render('publisher', { ref: req.params.id , title: 'Parceiros do ApartamentosEmLisboa.com', publisher: publisher, desc: `{${req.params.id} é um parceiro do apartamentosemlisboa.com . Aqui o corretor pode se cadastrar para indicar um cliente e direcioná-lo a um corretor em Portugal`, robots: 'INDEX, FOLLOW'});
    })

})

module.exports = router
