let createError = require('http-errors');
let express = require('express');

let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let partials = require('express-partials');

//context path para la aplicacion en el servidor
let session = require('express-session');
const contextPath = '/progdoc/';
exports.contextPath = contextPath;
const local = false
exports.local = local;

//cas autentication
let CASAuthentication = require('cas-authentication');
// Create a new instance of CASAuthentication.
let service = local === true ? 'http://localhost:3000/progdoc' : 'https://pruebas.etsit.upm.es'
let cas = new CASAuthentication({
  cas_url: 'https://repo.etsit.upm.es/cas-upm/',
  //local o despliegue
  service_url: service,
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
let permisosControllerProgDoc = require('./controllers/permisos_controllerProgDoc');

//borrar
//let cumplimentar = require('./controllers/cumplimentar_controller');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(partials());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
//local
app.use(express.static(path.join(__dirname, 'public')));
//despliegue y local
app.use('/progdoc', express.static(path.join(__dirname, 'public')));

// Set up an Express session, which is required for CASAuthentication.
app.use( session({
  secret            : 'super secret key',
  resave            : false,
  saveUninitialized : true,
}));

if(local === true){
  // Helper dinamico:
  app.use('', function (req, res, next) {
    // Hacer visible req.session en las vistas
    res.locals.session = req.session;
    next();
  });

  app.use(contextPath, cas.bounce, function (req, res, next) {
    if (!req.session.user) {
      req.session.user = req.session[cas.session_info];
    } if (!req.session.user.rols) {
      //probar roles de otras personas
      // req.session.user.mail = "mariajesus.ledesma@upm.es"

      req.session.user.rols = [];
      return models.Rol.findAll({
        attributes: ["rol", "PlanEstudioCodigo", "DepartamentoCodigo"],
        where: {
          PersonaEmail: req.session.user.mail
        },
        raw: true
      }).each((rol) => {
        console.log(rol)
        req.session.user.rols.push(rol)
      })
        .then((rols) => {
          console.log(req.session.user.rols)
          next();
        })
    } else {
      next();
    }
  })
  //router para contexto
  app.use(contextPath, router);

  //exit del cas
  app.get(contextPath + "logout", function (req, res, next) {
    req.session.destroy(function (err) {
      console.log('redirige y luego cas.logout')
      res.redirect('/');
    });
  });

  //guardar contexto y redirigir
  //lo de los rols lo hago en el app.use de contextPath
  app.use('/', cas.bounce, function (req, res) {
    if (!req.session.user) {
      req.session.user = req.session[cas.session_info];
    }
    res.redirect(contextPath);
  })
}
else{
  // Helper dinamico:
  app.use('', cas.bounce, function (req, res, next) {
    // Hacer visible req.session en las vistas
    res.locals.session = req.session;
    if (!req.session.user) {
      req.session.user = req.session[cas.session_info];
    }
    if (!req.session.user.rols) {
      //probar roles de otras personas
      // req.session.user.mail = "mariajesus.ledesma@upm.es"

      req.session.user.rols = [];
      return models.Rol.findAll({
        attributes: ["rol", "PlanEstudioCodigo", "DepartamentoCodigo"],
        where: {
          PersonaEmail: req.session.user.mail
        },
        raw: true
      }).each((rol) => {
        console.log(rol)
        req.session.user.rols.push(rol)
      })
        .then((rols) => {
          console.log(req.session.user.rols)
          next();
        })
    } else{
      next();
    }
  });

  //router para contexto
  app.use(contextPath, router);

  //exit del cas
  app.get(contextPath + "logout", function (req, res, next) {
    req.session.destroy(function (err) {
      console.log('redirige y luego cas.logout')
      res.redirect(contextPath);
    });
  });
}


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