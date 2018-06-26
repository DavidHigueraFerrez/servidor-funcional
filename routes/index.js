let express = require('express');
let router = express.Router();
let Sequelize = require('sequelize');
let models = require('../models');
let respController = require('../controllers/respDep_controller');
let permisosController = require('../controllers/permisos_controller');


router.get('/a', function (req, res) {
  console.log(req.baseUrl)
  console.log("adioos");
  console.log(req.session.user.mail);
  res.render('index');
  
});

// Unauthenticated clients will be redirected to the CAS login and then back to
// this route once authenticated.
router.get('/',permisosController.comprobarRolYPersona, function (req, res) {
  res.render('index');
});

//ruta que comprueba autenticacion para poder abrir una programacion docente
router.get('/Gestion', permisosController.comprobarAdmins, function (req, res) {
  res.render('gestion');
});

//ruta que permite que comprueba permisos para comprobar Grupos Cupos e Idiomas
router.get('/GruposCuposIdiomas', permisosController.comprobarJefeEstudiosOSecretaria,  function (req, res) {
  res.render('desarrollo');
});

//ruta para comprobar permisos para Asignar profesores(responsableDocente es principal)
router.get('/Cumplimentar', permisosController.comprobarAdmins, function (req, res) {
  req.session.menu = [];
  req.session.menu.push("drop_ProgDoc")
  req.session.menu.push("element_ProgDocCumplimentar")
  res.render('cumplimentar', {
    menu: req.session.menu,
    path : req.baseUrl
  });
});

//ruta para comprobar permsisos para Asignar Tribunales(solo responsableDocente por ahora)
router.get('/AsignarTribunales', permisosController.comprobarResponsableDocenteODirectorOCoordinadorOSubDirectorPosgradoOJefeEstudios, function (req, res) {
  res.render('abrirProgDoc');
});

//ruta para comprobar permisos para Asignar horarios examenes (coordinador de titulacion)
router.get('/AsignarHorariosExamenes', permisosController.comprobarDirectorOCoordinadorOSubDirectorPosgradoOJefeEstudios, function (req, res) {
  res.render('abrirProgDoc');
});

//ruta para comprobar permisos para asignar horarios grupos(coordinador titulacion)
router.get('/AsignarHorariosGrupos', permisosController.comprobarDirectorOCoordinadorOSubDirectorPosgradoOJefeEstudios, function (req, res) {
  res.render('abrirProgDoc');
});

//ruta para comprobar permisos para aprobar programacion docente(aprobar solo el jefe de estudios)¿aprobaciones intermedias?
router.get('/AprobarProgramacion', permisosController.comprobarJefeEstudios, function (req, res) {
  res.render('abrirProgDoc');
});
//ruta para comprobar permisos para ver programacion cursos anteriores
router.get('/Consulta', permisosController.comprobarAdmins, function (req, res) {
  res.render('consulta');
});

//ruta para comprobar Accesos al historial del sistema
router.get('/Historial', permisosController.comprobarAdmins, function (req, res) {
  res.render('historial');
});
//router.get('/logout',permisosController.noreturnLogout);

//rutads de resodic
router.get("/respDoc/tribunales", respController.getProgramacionDocente, respController.getTribunales)
router.get("/respDoc/editAsignacion", respController.edit)
router.get("/respDoc/aprobarAsignacion", respController.aprobarAsignacion)
router.post("/respDoc/guardarAsignacion", respController.guardarAsignacion)
router.post("/respDoc/guardarTribunales", respController.guardarTribunales)
router.get("/respDoc/", respController.getProgramacionDocente, respController.get);  
/*

// Unauthenticated clients will receive a 401 Unauthorized response instead of
// the JSON data.
router.get('/', cas.block, function (req, res) {
  console.log('entro 2');
  res.json({ success: true });
});


// An example of accessing the CAS user session variable. This could be used to
// retrieve your own local user records based on authenticated CAS username.
router.get('/', cas.block, function (req, res) {
  res.json({ cas_user: req.session[cas.session_name] });
});

// Unauthenticated clients will be redirected to the CAS login and then to the
// provided "redirectTo" query parameter once authenticated.
router.get('/', cas.bounce_redirect);

//rutas permitidas para la autenticacion
router.get('/tribunalActas', function (req, res) {
  let cas_user = req.session[cas.session_info];
  let role = cas_user.employeetype;
  let mail = cas_user.mail;
  console.log(role);
  console.log(mail);
  res.render('tribunalActas');
});

//entrar en coordinador
router.get('/coordinador', cas.bounce, function (req, res) {
  let cas_user = req.session[cas.session_info];
  let role = cas_user.employeetype;
  let mail = cas_user.mail;
  console.log(role);
  console.log(mail);

  models.Persona.findById(mail).then(persona => {
    if (persona) {
      console.log('si tiene acceso permitido');
      res.render('coordinador');
    }
    console.log('no tiene acceso permitido');
  })
  res.render('noPermitido');
});

//entrar en responsable departamento
router.get('/responsableDep', cas.bounce, function (req, res) {
  let cas_user = req.session[cas.session_info];
  let role = cas_user.employeetype;
  let mail = cas_user.mail;
  console.log(role);
  console.log(mail);

  models.Profesor.find({ where: { ProfesorEmail: mail } }).then(persona => {
    if (persona) {
      console.log('si tiene acceso permitido');
      res.render('index');
    }
    if (!persona) {
      console.log(persona);
      console.log('no tiene acceso permitido');
      res.render('noPermitido');
    }
  })
});

//entrar en director de posgrado
router.get('/directorPosgrado', cas.bounce, function (req, res) {
  let cas_user = req.session[cas.session_info];
  let role = cas_user.employeetype;
  let mail = cas_user.mail;
  console.log(role);
  console.log(mail);

  models.Persona.findById(mail).then(persona => {
    if (persona) {
      console.log('si tiene acceso permitido');
      res.render('directorPosgrado');
    }
    console.log('no tiene acceso permitido');
  })
  res.render('noPermitido');
});

//entrar en director de departamento
router.get('/directorDepartamento', cas.bounce, function (req, res) {
  let cas_user = req.session[cas.session_info];
  let role = cas_user.employeetype;
  let mail = cas_user.mail;
  console.log(role);
  console.log(mail);

  models.Persona.findById(mail).then(persona => {
    if (persona) {
      console.log('si tiene acceso permitido');
      res.render('directorDepartamento');
    }
    console.log('no tiene acceso permitido');
  })
  res.render('noPermitido');

});
//entrar en historial de departamento
router.get('/historial', cas.bounce, function (req, res) {
  let cas_user = req.session[cas.session_info];
  let role = cas_user.employeetype;
  let mail = cas_user.mail;
  console.log(role);
  console.log(mail);

  models.Persona.findById(mail).then(persona => {
    if (persona) {
      console.log('si tiene acceso permitido');
      res.render('historial');
    }
    console.log('no tiene acceso permitido');
  })
  res.render('noPermitido');

});
//entrar en direcor de departamento
router.get('/ejemplo1', cas.bounce, function (req, res) {
  let cas_user = req.session[cas.session_info];
  let role = cas_user.employeetype;
  let mail = cas_user.mail;
  console.log(role);
  console.log(mail);

  models.Persona.findById(mail).then(persona => {
    if (persona) {
      console.log('si tiene acceso permitido');
      res.render('ejemplo');
    }
    console.log('no tiene acceso permitido');
  })
  res.render('noPermitido');

});
router.get('/ja', cas.bounce);
*/
// This route will de-authenticate the client with the Express server and then
// redirect the client to the CAS logout page.

//router.get('/logout', cas.logout);

module.exports = router;