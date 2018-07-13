let createError = require('http-errors');
let express = require('express');

let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let partials = require('express-partials');

//context path para la aplicacion en el servidor
let session = require('express-session');
const contextPath = '/progdoc/';

//cas autentication
let CASAuthentication = require('cas-authentication');
// Create a new instance of CASAuthentication.
let cas = new CASAuthentication({
  cas_url: 'https://repo.etsit.upm.es/cas-upm/',
  //local
 // service_url: 'http://localhost:3000/progdoc',
  //despliegue
  service_url: 'https://pruebas.etsit.upm.es',
  cas_version: '3.0',
  session_info: true,
  destroy_session : true,
  renew: true
});


//instanciacion 
let app = express();
//rutas requeridas
let router = require('./routes/index')
let models = require('./models');
let Sequelize = require('sequelize');
let permisosController = require('./controllers/permisos_controller');

//borrar
let respController = require('./controllers/respDep_controller');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(partials());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
//local
//app.use(express.static(path.join(__dirname, 'public')));
//despliegue
app.use('/progdoc', express.static(path.join(__dirname, 'public')));


// Set up an Express session, which is required for CASAuthentication.
app.use( session({
  secret            : 'super secret key',
  resave            : false,
  saveUninitialized : true,
}));

// Helper dinamico:
app.use('', cas.bounce, function (req, res, next) {
  // Hacer visible req.session en las vistas
  res.locals.session = req.session;
  if(!req.session.user){
    req.session.user = req.session[cas.session_info];
  } 
  next();
});

//router para contexto
app.use(contextPath, router);

//exit del cas
app.get(contextPath+"logout", function (req, res, next) {
  req.session.destroy(function (err){
    console.log('redirige y luego cas.logout')
    res.redirect(contextPath);
  });
});


// catch 404 and forward to error handler
app.use(function (req, res, next) {

  let err = new Error('Not Found');
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
  res.render('error', { layout: false });
});


module.exports = app;
exports.contextPath = contextPath;
