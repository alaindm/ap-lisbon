var {User} = require('../models/user');
const jwt = require('jsonwebtoken');

var adminAuth = (req, res, next) => {
  var token = req.session.token  
  User
    .findByToken(token)
    .then(user => {      
      if (!user) {
        return Promise.reject();
      }
      try {       
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (e) {        
        return Promise.reject();
      }
      if(decoded.id === user._id.toString()){                             
        if(user.isAdmin === true){
          next()
        } else {
          res.status(401).send('Acesso Restrito');
        }
      } else {
        req.session.li = false // li -> logged in  
        res.status(401).send('Não autorizado.');
      }      
    })
    .catch((e) => {
      req.session.li = false // li -> logged in
      res.status(401).send('Não autorizado');
    })
};

module.exports = {adminAuth};