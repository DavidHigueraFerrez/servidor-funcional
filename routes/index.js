let express = require('express');
let app = require('../app')
let router = express.Router();
let Sequelize = require('sequelize');
let models = require('../models');
let respController = require('../controllers/respDep_controller');
let permisosControllerProgDoc = require('../controllers/permisos_controllerProgDoc');
let jefeController = require('../controllers/abrirprogdoc_controller');
let gestionController = require('../controllers/JE_controller')
let menuProgDocController = require('../controllers/menuProgDoc_controller')
let coordinadorController = require('../controllers/coordinador_controller')
let gruposController = require('../controllers/grupos_controller')
let gestionRoles = require('../controllers/gestion_controller')
let estadoController = require("../controllers/estado_controller")
let pdf = require('../controllers/pdfEjemplo')
let infopdfprogdocController = require('../controllers/infopdfprogdoc_controller')
let historialController = require('../controllers/historial_controller')
let estados = require('../estados');



router.all('*', permisosControllerProgDoc.comprobarRolYPersona);

// Unauthenticated clients will be redirected to the CAS login and then back to
// this route once authenticated.
router.get('/', function (req, res) {
  res.render('index');
});

//ruta para comprobar permisos para Asignar profesores(responsableDocente es principal)
router.get('/Cumplimentar', function (req, res, next) {
  req.session.menu = [];
  req.session.menu.push("drop_ProgDoc")
  req.session.menu.push("element_ProgDocCumplimentar")
  next()
}, menuProgDocController.getPlanes, menuProgDocController.getCumplimentar);
router.get('/Consultar', function (req, res, next) {
  req.session.menu = [];
  req.session.menu.push("drop_ProgDoc")
  req.session.menu.push("element_ProgDocConsultar")
  next()
}, menuProgDocController.getPlanes, menuProgDocController.getConsultar);
router.get('/Historial', function (req, res, next) {
  req.session.menu = [];
  req.session.menu.push("drop_ProgDoc")
  req.session.menu.push("element_ProgDocHistorial")
  next()
}, menuProgDocController.getPlanes, historialController.getPDsWithPdf, menuProgDocController.getHistorial);
//ruta para comprobar permisos para Asignar profesores(responsableDocente es principal)
router.get('/Gestion',   function (req, res, next) {
  req.session.menu = [];
  req.session.menu.push("drop_ProgDoc")
  req.session.menu.push("element_ProgDocGestion")
  next()
}, function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  res.locals.rols.push({ rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  next();
}, permisosControllerProgDoc.comprobarRols, menuProgDocController.getPlanes, menuProgDocController.getGestion);

router.get('/consultar/estado', menuProgDocController.getProgramacionDocente, estadoController.getEstado);
router.get('/estado', menuProgDocController.getProgramacionDocente, estadoController.getEstado);


//router.get('/logout',permisosController.noreturnLogout);

//rutads de resodic
router.get("/pdf", pdf.generarPDF);

router.get("/respDoc/tribunales", menuProgDocController.getProgramacionDocente, function (req, res, next) {
  res.locals.rols = [];  
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  res.locals.rols.push({ rol: 'ResponsableDocente', PlanEstudioCodigo: req.session.planCodigo, DepartamentoCodigo: req.session.departamentoID, condiciones:
    [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({ rol: 'DirectorDepartamento', PlanEstudioCodigo: req.session.planCodigo, DepartamentoCodigo: req.session.departamentoID, condiciones:
    [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
   });
  res.locals.rols.push({ rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
    [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }] 
  });
  next();
}, permisosControllerProgDoc.comprobarRols, respController.getTribunales);

router.get("/consultar/tribunales", menuProgDocController.getProgramacionDocente, respController.getTribunales);
router.get("/consultar/PDF", menuProgDocController.getProgramacionDocente, infopdfprogdocController.generarPDF);
 
router.get("/respDoc/editAsignacion", function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  res.locals.rols.push({
    rol: 'ResponsableDocente', PlanEstudioCodigo: req.session.planCodigo, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, permisosControllerProgDoc.comprobarRols, respController.editAsignacion);

router.post("/respDoc/aprobarAsignacion", function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  res.locals.rols.push({
    rol: 'ResponsableDocente', PlanEstudioCodigo: req.session.planCodigo, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: 'DirectorDepartamento', PlanEstudioCodigo: req.session.planCodigo, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, permisosControllerProgDoc.comprobarRols,respController.aprobarAsignacion);

router.post("/respDoc/guardarAsignacion", function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  res.locals.rols.push({
    rol: 'ResponsableDocente', PlanEstudioCodigo: req.session.planCodigo, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, permisosControllerProgDoc.comprobarRols, menuProgDocController.anadirProfesor,respController.guardarAsignacion);

router.post("/respDoc/aprobarTribunales", function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  res.locals.rols.push({
    rol: 'ResponsableDocente', PlanEstudioCodigo: req.session.planCodigo, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: 'DirectorDepartamento', PlanEstudioCodigo: req.session.planCodigo, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, permisosControllerProgDoc.comprobarRols,menuProgDocController.anadirProfesor,respController.guardarTribunales, respController.aprobarTribunales);

router.post("/respDoc/guardarTribunales", function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  res.locals.rols.push({
    rol: 'ResponsableDocente', PlanEstudioCodigo: req.session.planCodigo, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: 'DirectorDepartamento', PlanEstudioCodigo: req.session.planCodigo, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoTribunales[' + req.session.departamentoID, resultado: estados.estadoTribunal.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, permisosControllerProgDoc.comprobarRols,menuProgDocController.anadirProfesor,respController.guardarTribunales, respController.reenviar);

router.get("/respDoc/profesores", menuProgDocController.getProgramacionDocente, function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  res.locals.rols.push({
    rol: 'ResponsableDocente', PlanEstudioCodigo: req.session.planCodigo, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: 'DirectorDepartamento', PlanEstudioCodigo: req.session.planCodigo, DepartamentoCodigo: req.session.departamentoID, condiciones:
      [{ condicion: 'estadoProfesores[' + req.session.departamentoID, resultado: estados.estadoProfesor.aprobadoResponsable }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, permisosControllerProgDoc.comprobarRols, menuProgDocController.getGrupos, respController.getAsignaciones);

router.get("/consultar/profesores", menuProgDocController.getProgramacionDocente, menuProgDocController.getGrupos, respController.getAsignaciones);

router.get('/coordinador/horarios', menuProgDocController.getProgramacionDocente, function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  res.locals.rols.push({
    rol: 'CoordinadorTitulacion', PlanEstudioCodigo: req.session.planCodigo, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoHorarios', resultado: estados.estadoHorario.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, permisosControllerProgDoc.comprobarRols, menuProgDocController.getGrupos, coordinadorController.getHorario);


router.get('/coordinador/examenes', menuProgDocController.getProgramacionDocente, function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  res.locals.rols.push({
    rol: 'CoordinadorTitulacion', PlanEstudioCodigo: req.session.planCodigo, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoExamenes', resultado: estados.estadoExamen.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, permisosControllerProgDoc.comprobarRols, coordinadorController.getExamenes);
router.get('/consultar/examenes', menuProgDocController.getProgramacionDocente, coordinadorController.getExamenes);

router.get('/consultar/horarios', menuProgDocController.getProgramacionDocente, menuProgDocController.getGrupos, coordinadorController.getHorario);
router.post('/coordinador/guardarHorarios', function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  res.locals.rols.push({
    rol: 'CoordinadorTitulacion', PlanEstudioCodigo: req.session.planCodigo, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoHorarios', resultado: estados.estadoHorario.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, permisosControllerProgDoc.comprobarRols, coordinadorController.guardarHorarios, coordinadorController.reenviar);

router.post('/coordinador/guardarExamenes', function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  res.locals.rols.push({
    rol: 'CoordinadorTitulacion', PlanEstudioCodigo: req.session.planCodigo, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoExamenes', resultado: estados.estadoExamen.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, permisosControllerProgDoc.comprobarRols, coordinadorController.guardarExamenes, coordinadorController.reenviarExamenes);

router.post('/coordiandor/aprobarHorarios', function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  res.locals.rols.push({
    rol: 'CoordinadorTitulacion', PlanEstudioCodigo: req.session.planCodigo, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoHorarios', resultado: estados.estadoHorario.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, permisosControllerProgDoc.comprobarRols, coordinadorController.guardarHorarios, coordinadorController.aprobarHorarios);

router.post('/coordiandor/aprobarExamenes', function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  res.locals.rols.push({
    rol: 'CoordinadorTitulacion', PlanEstudioCodigo: req.session.planCodigo, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoExamenes', resultado: estados.estadoExamen.abierto }, { condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.abierto }]
  });
  res.locals.rols.push({
    rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, permisosControllerProgDoc.comprobarRols, coordinadorController.guardarExamenes, coordinadorController.aprobarExamenes);

router.get('/grupos/getGrupos', menuProgDocController.getProgramacionDocente, gruposController.getGrupos)
router.get('/consultar/grupos', menuProgDocController.getProgramacionDocente, gruposController.getGrupos);

router.get('/gestionGrupos/getGrupos',function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  res.locals.rols.push({ rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  next();
}, permisosControllerProgDoc.comprobarRols, menuProgDocController.getProgramacionDocente, gruposController.getGrupos)


router.post('/gestionGrupos/guardarGruposJE',function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  res.locals.rols.push({ rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  next();
}, permisosControllerProgDoc.comprobarRols, gruposController.EliminarGruposJE, gruposController.ActualizarGruposJE, gruposController.AnadirGruposJE )

router.get("/AbrirCerrar", function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  res.locals.rols.push({ rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  next();
}, permisosControllerProgDoc.comprobarRols, gestionController.gestionProgDoc);

router.post("/abrirProgDoc", function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  res.locals.rols.push({ rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  next();
}, permisosControllerProgDoc.comprobarRols, jefeController.abrirNuevaProgDoc, gestionController.abrirProgDoc);

router.post("/cerrarProgDoc", function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  res.locals.rols.push({ rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  next();
}, permisosControllerProgDoc.comprobarRols, gestionController.cerrarProgDoc, infopdfprogdocController.generarPDF, gestionController.cerrarProgDoc2);

router.post("/abrirIncidenciaProgDoc", function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null });
  res.locals.rols.push({ rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null });
  next();
}, permisosControllerProgDoc.comprobarRols, jefeController.abrirNuevaProgDoc, gestionController.abrirIncidenciaProgDoc);

router.post("/cerrarIncidenciaProgDoc", function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  res.locals.rols.push({ rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:[] });
  next();
}, permisosControllerProgDoc.comprobarRols, gestionController.cerrarIncidenciaProgDoc, infopdfprogdocController.generarPDF, gestionController.cerrarProgDoc2);


//gestionRoles
//router.post('/gestionRoles', gestionRoles.getRoles);
router.get('/gestionRoles',gestionRoles.getRoles);
//ruta para guardar

router.post("/gestionRoles/guardarRoles", function (req, res, next) {
  res.locals.rols = [];
  res.locals.rols.push({ rol: 'Admin', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones: [] });
  res.locals.rols.push({
    rol: 'JefeEstudios', PlanEstudioCodigo: null, DepartamentoCodigo: null, condiciones:
      [{ condicion: 'estadoProGDoc', resultado: estados.estadoProgDoc.incidencia }]
  });
  next();
}, permisosControllerProgDoc.comprobarRols,menuProgDocController.anadirProfesor, gestionRoles.guardarRoles);
      //atento añadir la ruta del controlador para guardar 


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
