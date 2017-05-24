var express = require('express');
var router = express.Router();
const _ = require('lodash');
var {adminAuth} = require('../middleware/adminAuth');
var {User} = require('../models/user');
const {Publisher} = require('../models/publishers');

router.get('/', adminAuth, function(req, res, next) {
    User
        .find({}, 'full_name _id')
        .sort('full_name')
        .then(users => {
            Publisher
                .find({}, 'username email')
                .sort('username')
                .then(publishers => {
                    res.render('admin/userList', { user: users , publisher: publishers, title: 'Painel do Admin', desc: 'Painel de controle do site', robots: 'NOINDEX, NOFOLLOW'})
                })            
        })
        .catch(error => {
            req.flash('error', 'Erro ao listar usuários')
            res.redirect(303, '/')
        }) 
});

router.get('/criar-divulgador', adminAuth, (req, res, next) => {
    res.render('admin/criar-divulgador', { title: 'Cadastrar novo Divulgador', robots: 'NOINDEX, NOFOLLOW'})
})

router.post('/criar-divulgador', adminAuth, (req, res, next) => {
    var publisherParams = _.pick(req.body, ['username', 'email'])
    var publisher = new Publisher(publisherParams)
    publisher
        .save()
        .then(publisher => {
            User
                .findOneAndUpdate({email: publisher.email}, {isPublisher: true})
                .then(user => {
                    req.flash('success', 'Divulgador cadastrado')
                    res.redirect(303, '/admin')
                })
            
        })
        .catch(errors => {
        if(errors.name == 'ValidationError'){            
            _.forIn(errors.errors, function(value, key) {
            req.flash('error', value.message)              
            });    
            res.locals.messages = req.flash()        
            res.render('customers/new', { customer: req.body, title: 'Cadastrar novo cliente', robots: 'NOINDEX, NOFOLLOW'})
        } else {
            req.flash('error', 'Username já cadastrado.')
            res.locals.messages = req.flash()
            res.render('admin/criar-divulgador', { publisher: req.body, title: 'Cadastrar novo Divulgador', robots: 'NOINDEX, NOFOLLOW'})
        } 
        })
})

module.exports = router
