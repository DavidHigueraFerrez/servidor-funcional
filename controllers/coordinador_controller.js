let app = require('../app')
let models = require('../models');
let Sequelize = require('sequelize');
const nodemailer = require('nodemailer');
let mail = require('../mail/mail');
const op = Sequelize.Op;
let estados = require('../estados');

// GET /respDoc/:pdID/:departamentoID/Horario
exports.getHorario = function (req, res, next){

    req.session.submenu = "Horarios"

    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
        res.render("horarios", {
            estado: "Programacion docente no abierta",
            menu: req.session.menu,
            submenu: req.session.submenu,
            planAcronimo: req.session.planAcronimo,
            departamentoID: req.session.departamentoID,
            planEstudios: req.session.planEstudios,
            asignacionsHorario : null
        })
    }
    else if (estados.estadoHorario.abierto !== res.locals.progDoc['ProgramacionDocentes.estadoHorarios']) {
        res.render("horarios", {
            estado: "Asignación de horarios ya se realizó",
            menu: req.session.menu,
            submenu: req.session.submenu,
            planAcronimo: req.session.planAcronimo,
            departamentoID: req.session.departamentoID,
            planEstudios: req.session.planEstudios,
            asignacionsHorario: null
        })
    } else {
        let asignacionsHorario = []; //asignaciones existentes
        let cursos = []; //array con los cursos por separado
        let asignaturas = []; //array con los acronimos de las asignaturas por separado
        let pdID = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.identificador']
        //sino se especifica departamento se queda con el primero del plan responsable. Arriba comprobé que existe el departamento en la pos 0.
        let departamentoID = req.session.departamentoID ? req.session.departamentoID : res.locals.departamentosResponsables[0].codigo;
        //si no estaba inicializada la inicializo.
        req.session.departamentoID = departamentoID;
        let departamentoExisteEnElPlan = res.locals.departamentosResponsables.find(function (obj) { return obj.codigo === departamentoID; });

    
        getAsignacionHorario(pdID);

    
        function getAsignacionHorario(ProgramacionDocenteIdentificador) {
            models.Asignatura.findAll({
                where: {
                    ProgramacionDocenteIdentificador: pdID,
                },
                attributes: ['acronimo', 'curso', 'identificador', 'nombre', 'semestre'],
                order: [

                    [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
                    [Sequelize.literal('"AsignacionProfesors.Grupo.nombre"'), 'ASC']
                ],
                raw: true,
                include: [{
                    //left join 
                    model: models.AsignacionProfesor,
                    where: {
                        ProfesorId: null  //cojo las que no son de asignacion de profesores
                    },
                    attributes: ['Dia','HoraInicio', 'Duracion', 'GrupoId', 'identificador'],
                    include: [{
                        model: models.Grupo,
                        attributes: ['nombre']
                    }]
                }]
            })
                .each(function (ej) {
                    //lo convierto en string
                    let cPos = asignacionsHorario.map(function (x) { return x.curso; }).indexOf(ej.curso);
                    let c = asignacionsHorario.find(function (obj) { return obj.curso === ej['curso']; });
                    //si el curso no está lo añado
                    if(!c){
                        cursos.push(ej['curso'])
                        let cursoAsignacion = {};
                        cursoAsignacion.curso = ej['curso'];
                        cursoAsignacion.grupos = []
                        asignacionsHorario.push(cursoAsignacion);
                        cPos = asignacionsHorario.map(function (x) { return x.curso; }).indexOf(ej.curso);
                        c = cursos.find(function (obj) { return obj === ej['curso']; });
                    }
                    
                    //busco si el grupo está
                    let gPos = asignacionsHorario[cPos].grupos.map(function (x) { return x.grupoCodigo; }).indexOf(ej['AsignacionProfesors.GrupoId']);
                    let g = asignacionsHorario[cPos].grupos.find(function (obj) { return obj.grupoCodigo === ej['AsignacionProfesors.GrupoId']; });
                    if(!g){
                        g={};
                        g.grupoCodigo = ej['AsignacionProfesors.GrupoId'];
                        g.grupoNombre = ej['AsignacionProfesors.Grupo.nombre'];
                        g.asignaturas = [];
                        g.asignaciones = [];
                        asignacionsHorario[cPos].grupos.push(g);   
                        gPos = asignacionsHorario[cPos].grupos.map(function (x) { return x.grupoCodigo; }).indexOf(ej['AsignacionProfesors.GrupoId']);
                        g = asignacionsHorario[cPos].grupos.find(function (obj) { return obj.grupoCodigo === ej['AsignacionProfesors.GrupoId']; });
                          }
                    //busco si está la asignatura
                    let aPos = asignacionsHorario[cPos].grupos[gPos].asignaturas.map(function (x) { return x.identificador; }).indexOf(ej['identificador']);
                    let a = asignacionsHorario[cPos].grupos[gPos].asignaturas.find(function (obj) { return obj.identificador === ej['identificador']; });
                    if (!a) {
                        a = {};
                        a.acronimo = ej['acronimo'];
                        a.nombre = ej['nombre'];
                        a.identificador = ej['identificador'];
                        a.semestre = ej['semestre']
                        asignacionsHorario[cPos].grupos[gPos].asignaturas.push(a);
                        aPos = asignacionsHorario[cPos].grupos[gPos].asignaturas.map(function (x) { return x.identificador; }).indexOf(ej['identificador']);
                        a = asignacionsHorario[cPos].grupos[gPos].asignaturas.find(function (obj) { return obj.identificador === ej['identificador']; });
                    }
                    //miro si la asignacion no está vacía
                    if (ej['AsignacionProfesors.Dia'] !== null){
                        let asignacion = {};
                        asignacion.identificador = ej['AsignacionProfesors.identificador']
                        asignacion.dia = ej['AsignacionProfesors.Dia'];
                        asignacion.horaInicio = ej['AsignacionProfesors.HoraInicio']
                        asignacion.duracion = ej['AsignacionProfesors.Duracion']
                        asignacion.asignaturaAcronimo = ej['acronimo'];
                        asignacion.asignaturaNombre = ej['nombre'];
                        asignacion.asignaturaIdentificador = ej['identificador'];       
                        asignacionsHorario[cPos].grupos[gPos].asignaciones.push(asignacion);                        
                    }
                   
                })
                .then(function (e) {
                  /*  console.log(asignacionsHorario)
                    console.log(asignacionsHorario[0])
                    console.log(asignacionsHorario[0].grupos[0].asignaturas)
                    console.log(asignacionsHorario[0].grupos[0].asignaciones)
                    */
                    //console.log(req.originalUrl)
                    //console.log(req.baseUrl)
                    //console.log(req.path)
                    let nuevopath = "" + req.baseUrl + "/coordinador/guardarHorarios"
                    res.render('horarios',
                        {
                            asignacionsHorario: asignacionsHorario,
                            nuevopath: nuevopath,
                            aprobarpath: "" + req.baseUrl + "/coordiandor/aprobarHorarios",
                            planAcronimo: req.session.planAcronimo,
                            estadoHorarios: res.locals.progDoc['ProgramacionDocentes.estadoHorarios'],
                            pdID: pdID,
                            menu: req.session.menu,
                            submenu: req.session.submenu,
                            estado: null,
                            departamentoID: req.session.departamentoID,
                            planEstudios: req.session.planEstudios
                        })


                })
        }
   }

}

exports.guardarHorario = function (req,res,next){
    req.session.submenu = "Horarios"
    let whereEliminar = {};
    let pdID = req.body.pdID
    let planAcronimo = req.session.planAcronimo
    let departamentoID = req.session.departamentoID
    let toEliminar = req.body.eliminar
    let promises = [];
    if (toEliminar) {
        if (!Array.isArray(toEliminar)) {
            let asignacion = Number(toEliminar.split("_")[5])
            whereEliminar.identificador = Number(asignacion);
        } else {
            whereEliminar['$or'] = [];
            toEliminar.forEach(function (element, index) {
                let asignacion = Number(element.split("_")[5])
                let nuevoFiltro = {};
                nuevoFiltro.identificador = asignacion;
                whereEliminar['$or'].push(nuevoFiltro);
            });
        }
        let promise1 = models.AsignacionProfesor.destroy({
            where: whereEliminar
        })
        promises.push(promise1)
    }
    let toAnadir = req.body.anadir;
    //console.log(toAnadir)
    let queryToAnadir = []
    if (toAnadir) {
        if (!Array.isArray(toAnadir)) {
            let nuevaEntrada = {};
            nuevaEntrada.AsignaturaId = Number(toAnadir.split("_")[5]);
            nuevaEntrada.GrupoId = Number(toAnadir.split("_")[2]);
            nuevaEntrada.Duracion = 60;
            nuevaEntrada.Dia = toAnadir.split("_")[3];
            nuevaEntrada.HoraInicio = toAnadir.split("_")[4]+":00:00";
            queryToAnadir.push(nuevaEntrada);
        } else {
            toAnadir.forEach(function (element, index) {
                let nuevaEntrada = {};
                nuevaEntrada.AsignaturaId = Number(element.split("_")[5]);
                nuevaEntrada.GrupoId = Number(element.split("_")[2]);
                nuevaEntrada.Duracion = 60;
                nuevaEntrada.Dia = element.split("_")[3];
                nuevaEntrada.HoraInicio = element.split("_")[4] + ":00:00";
                queryToAnadir.push(nuevaEntrada);
            });
        }
        let promise2 = models.AsignacionProfesor.bulkCreate(
            queryToAnadir
        )
        promises.push(promise2)
    }

    Promise.all(promises).then(() => {
        res.redirect("" + req.baseUrl + "/coordinador/horarios?departamentoID=" + req.session.departamentoID + "&planAcronimo=" + req.session.planAcronimo)
    });


    
}



