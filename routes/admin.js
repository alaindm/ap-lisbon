var express = require('express');
var router = express.Router();
const _ = require('lodash');
var {adminAuth} = require('../middleware/adminAuth');
var {User} = require('../models/user');

router.get('/', adminAuth, function(req, res, next) {
    User
        .find({}, 'full_name _id')
        .sort('full_name')
        .then(users => {
            res.render('admin/userList', { user: users , title: 'Painel do Admin', desc: 'Paineld de controle do site', robots: 'NOINDEX, NOFOLLOW'})
        })
        .catch(error => {
            req.flash('error', 'Erro ao listar usuários')
            res.redirect(303, '/')
        }) 
});

module.exports = router
