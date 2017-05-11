var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
var bodyParser = require('body-parser');
var hbs = require('express-handlebars')
var flash = require('connect-flash');
require('./config/config');
var {mongoose} = require('./db/mongoose');
var index = require('./routes/index');
var users = require('./routes/users');
var customers = require('./routes/customers');
var admin = require('./routes/admin');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// configure the view engine 
app.engine('hbs', hbs({
  extname: 'hbs',  
  defaultLayout: __dirname + '/views/layouts/default.hbs',
  partialsDir: __dirname + '/views/partials',
  layoutsDir: __dirname + '/views/layouts'
}));


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cookieSession({
  name: 'appSession',
  secret: process.env.SESSION_SECRET
}))
app.use(flash());
// app.use(require('node-sass-middleware')({
//   src: path.join(__dirname, 'public'),
//   dest: path.join(__dirname, 'public'),
//   indentedSyntax: true,
//   sourceMap: true
// }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views/partnershipContracts')));

app.use(function(req, res, next) {
  res.locals.messages = req.flash()
  res.locals.isLoggedIn = req.session.li
  next();
});

app.use('/', index)
app.use('/u', users)
app.use('/customers', customers)
app.use('/admin', admin)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
