let app = require('../app')
let models = require('../models');
let Sequelize = require('sequelize');
const nodemailer = require('nodemailer');
let mail = require('../mail/mail');
const op = Sequelize.Op;
let estados = require('../estados');
let funciones = require('../funciones');
let JEcontroller = require('./JE_controller')


// GET /respDoc/:pdID/:departamentoID
exports.getAsignaciones = function (req, res, next) {
    /*console.log(req.originalUrl)
    console.log(req.baseUrl)
    console.log(req.path)*/
    req.session.submenu = "Profesores"
    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc
    if (!res.locals.progDoc || !res.locals.departamentosResponsables){
        let view = req.originalUrl.toLowerCase().includes("/consultar/") ? "asignacionesConsultar" : "asignaciones"
        res.render(view, {
            estado:"Programacion docente no abierta",
            permisoDenegado: res.locals.permisoDenegado, 
            profesores: null,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planAcronimo: req.session.planAcronimo,
            departamentoID: req.session.departamentoID,
            departamentosResponsables: res.locals.departamentosResponsables,
            estadosProfesor: estados.estadoProfesor,
            estadosProgDoc: estados.estadoProgDoc,
            planEstudios: req.session.planEstudios
        })
    }
    //hay que comprobar que no sea una url de consultar.
    else if (!comprobarEstadoCumpleUno(estados.estadoProfesor.abierto, res.locals.progDoc['ProgramacionDocentes.estadoProfesores']) 
    && !comprobarEstadoCumpleUno(estados.estadoProfesor.aprobadoResponsable, res.locals.progDoc['ProgramacionDocentes.estadoProfesores']) 
        && res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.abierto && !req.originalUrl.toLowerCase().includes("/consultar/")){
        res.render("asignaciones", {
            estado: "Asignación de profesores ya se realizó",
            permisoDenegado: res.locals.permisoDenegado,
            profesores: null,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planAcronimo: req.session.planAcronimo,
            departamentoID: req.session.departamentoID,
            departamentosResponsables: res.locals.departamentosResponsables,
            estadosProfesor: estados.estadoProfesor,
            estadosProgDoc: estados.estadoProgDoc,
            planEstudios: req.session.planEstudios
        })
    }else{
        req.session.asignacion = [];
        let gruposBBDD = res.locals.grupos;
        let pdID = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.identificador']
        //sino se especifica departamento se queda con el primero del plan responsable. Arriba comprobé que existe el departamento en la pos 0.
        let departamentoID = req.session.departamentoID ? req.session.departamentoID : res.locals.departamentosResponsables[0].codigo;
        //si no estaba inicializada la inicializo.
        req.session.departamentoID = departamentoID;
        let departamentoExisteEnElPlan = res.locals.departamentosResponsables.find(function (obj) { return obj.codigo === departamentoID; });
        if (!departamentoExisteEnElPlan){
            let view = req.originalUrl.toLowerCase().includes("/consultar/") ? "asignacionesConsultar" : "asignaciones"
            res.render(view, {
                estado: "El departamento seleccionado no es responsable de ninguna asignatura del plan",
                permisoDenegado: res.locals.permisoDenegado,
                profesores: null,
                menu: req.session.menu,
                submenu: req.session.submenu,
                planAcronimo: req.session.planAcronimo,
                departamentoID: req.session.departamentoID,
                departamentosResponsables: res.locals.departamentosResponsables,
                estadosProfesor: estados.estadoProfesor,
                estadosProgDoc: estados.estadoProgDoc,
                planEstudios: req.session.planEstudios
            })
        }
        else{
            if (res.locals.permisoDenegado) {
                let view = req.originalUrl.toLowerCase().includes("/consultar/") ? "asignacionesConsultar" : "asignaciones"
                res.render(view, {
                    estado: null,
                    permisoDenegado: res.locals.permisoDenegado,
                    asignacion: null,
                    profesores: null,
                    menu: req.session.menu,
                    submenu: req.session.submenu,
                    planAcronimo: req.session.planAcronimo,
                    departamentoID: req.session.departamentoID,
                    departamentosResponsables: res.locals.departamentosResponsables,
                    estadosProfesor: estados.estadoTribunal,
                    estadosProgDoc: estados.estadoProgDoc,
                    planEstudios: req.session.planEstudios
                })
            } 
            else if (req.session.profesores) {
                getAsignacion(pdID, departamentoID);

            } else {
                req.session.profesores = [];


                models.Persona.findAll({
                    attributes: ['email', 'nombre', 'apellido'],
                    include: [{
                        model: models.Profesor,
                        required: true,
                    }],
                    raw: true
                })
                    .each(function (profesor) {
                        let nombre = profesor['apellido'] + " " + profesor['nombre']
                        let nombreCorregido = profesor['apellido'] + "," + profesor['nombre']
                        nombreCorregido = funciones.primerasMayusc(nombreCorregido)
                        let correo = profesor['email']
                        let prof = { nombre: nombre, correo: correo, nombreCorregido: nombreCorregido }
                        req.session.profesores.push(prof);

                    })
                    .then(function (params) {
                        //console.log(req.session.profesores);
                        getAsignacion(pdID, departamentoID);
                    })
                    .catch(function (error) {
                        console.log("Error:", error);
                        next(error);
                    });

            }
            function getAsignacion(ProgramacionDocenteIdentificador, DepartamentoResponsable) {
                models.Asignatura.findAll({
                    where: {
                        //se obtendrá con req D510 1
                        ProgramacionDocenteIdentificador: ProgramacionDocenteIdentificador,
                        DepartamentoResponsable: DepartamentoResponsable,
                        semestre: {
                            [op.ne]: null,
                        }  
                    },
                    attributes: ['acronimo', 'curso', 'CoordinadorAsignatura', 'identificador', 'nombre', 'semestre'],
                    order: [

                        [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
                        [Sequelize.literal('"Asignatura"."semestre"'), 'ASC'],
                        [Sequelize.literal('"AsignacionProfesors.Grupo.nombre"'), 'ASC']
                    ],
                    raw: true,
                    include: [{
                        //left join 
                        model: models.AsignacionProfesor,
                        where: {
                            Dia: null,
                            Nota: null,  //cojo las que no son de horario
                        },
                        required: false,
                        attributes: ['ProfesorId', 'GrupoId', 'identificador'],
                        include: [{
                            model: models.Grupo,
                            attributes: ['nombre'],
                        }]
                    }]
                })
                    .each(function (ej) {
                        console.log(ej.nombre)
                        let asign = req.session.asignacion.find(function (obj) { return obj.nombre === ej['nombre']; });
                        if (!asign) {
                            asign = {}
                            let obj = req.session.profesores.find(function (obj) { return obj.correo === ej['CoordinadorAsignatura']; });
                            if (!obj) {
                                obj = "No hay coordinador"
                            }
                            asign.acronimo = ej.acronimo;
                            asign.nombre = ej.nombre
                            asign.identificador = ej.identificador
                            asign.curso = ej.curso;
                            asign.coordinador = obj
                            asign.grupos = [];
                            let s1;
                            let s2;
                            switch (pdID.split("_")[3]) {
                                case '1S':
                                    s1 = (ej.semestre === '1S' || ej.semestre === '1S-2S' || ej.semestre === 'A' || ej.semestre === 'I')
                                    s2 = false;
                                    break;
                                case '2S':
                                    s1 = false;
                                    s2 = (ej.semestre === '2S' || ej.semestre === '1S-2S' || ej.semestre === 'A' || ej.semestre === 'I')
                                    break;
                                default:
                                    s1 = (ej.semestre === '1S' || ej.semestre === '1S-2S' || ej.semestre === 'A' || ej.semestre === 'I')
                                    s2 = (ej.semestre === '2S' || ej.semestre === '1S-2S' || ej.semestre === 'A' || ej.semestre === 'I')  
                                    break;
                            }
                            let coincidenciasGrupos = [];
                            if(s1){
                                coincidenciasGrupos = gruposBBDD.filter(
                                    gr => (Number(gr.curso) === Number(ej['curso']) && Number(gr.nombre.split(".")[1]) === 1)
                                );
                            }
                            if (s2) {
                                coincidenciasGrupos = coincidenciasGrupos.concat( gruposBBDD.filter(
                                    gr => (Number(gr.curso) === Number(ej['curso']) && Number(gr.nombre.split(".")[1]) === 2)
                                ));
                                
                            }
                            for (let i = 0; i < coincidenciasGrupos.length; i++) {
                                let grupo = {};
                                grupo.GrupoNombre = coincidenciasGrupos[i].nombre
                                grupo.GrupoId = coincidenciasGrupos[i].grupoId
                                grupo.profesors = [];
                                asign.grupos.push(grupo)
                            }                           
                            req.session.asignacion.push(asign);
                            asign = req.session.asignacion.find(function (obj) { return obj.nombre === ej['nombre']; });
                        }
                        let grupo = asign['grupos'].find(function (obj) { return obj.GrupoId === ej["AsignacionProfesors.GrupoId"]; });
                        if(grupo){
                            let profi = req.session.profesores.find(function (obj) { return obj.correo === ej["AsignacionProfesors.ProfesorId"]; });
                            if (profi) {
                                let p = {};
                                p.correo = profi.correo;
                                p.nombre = profi.nombre;
                                p.nombreCorregido = profi.nombreCorregido;
                                p.asignacion = ej["AsignacionProfesors.identificador"]
                                grupo.profesors.push(p)
                            }
                        }            
                    })
                    .then(function (e) {
                        //console.log(req.originalUrl)
                        //console.log(req.baseUrl)
                        //console.log(req.path)
                        let nuevopath = "" + req.baseUrl + "/respdoc/editAsignacion"
                        let view = req.originalUrl.toLowerCase().includes("/consultar/") ? "asignacionesConsultar" : "asignaciones"
                        res.render(view,
                            {
                                profesores: req.session.profesores,
                                asignacion: req.session.asignacion,
                                nuevopath: nuevopath,
                                aprobarpath: "" + req.baseUrl + "/respDoc/aprobarAsignacion",
                                planAcronimo: req.session.planAcronimo,
                                estadoProfesores: res.locals.progDoc['ProgramacionDocentes.estadoProfesores'],
                                estadoProgDoc: res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'],
                                pdID: pdID,
                                menu: req.session.menu,
                                submenu: req.session.submenu,
                                estado: null,
                                permisoDenegado: res.locals.permisoDenegado,
                                departamentoID: req.session.departamentoID,
                                departamentosResponsables: res.locals.departamentosResponsables,
                                estadosProfesor: estados.estadoProfesor,
                                estadosProgDoc: estados.estadoProgDoc,
                                planEstudios: req.session.planEstudios
                            })


                    })
            }  
        }

    }
    
}

// GET respDoc/editAsignacion:pdID/:departamentoID/:acronimo
exports.editAsignacion = function (req, res, next) {
    req.session.submenu = "Profesores"
    let pdID = req.query.pdID
    let departamentoID = req.session.departamentoID
    //por defecto es acronimo pero si no hay debe ser el nombre
    let acronimo = req.query.acronimo
    let asign = req.session.asignacion.find(function (obj) { return (obj.acronimo === acronimo || obj.nombre === acronimo); });
    if (!res.locals.permisoDenegado) {
            res.render('asignacionesCumplimentar',
                {
                    asign: asign,
                    pdID: pdID,
                    cancelarpath: "" + req.baseUrl + "/respDoc/profesores?planAcronimo=" + req.session.planAcronimo + "&departamentoID=" + departamentoID,
                    nuevopath: "" + req.baseUrl + "/respDoc/guardarAsignacion",
                    planAcronimo: req.session.planAcronimo,
                    departamentoID: req.session.departamentoID,
                    menu: req.session.menu,
                    submenu: req.session.submenu,
                    profesores: req.session.profesores,
                    estadosProfesor: estados.estadoProfesor,
                    estadosProgDoc: estados.estadoProgDoc,
                    planEstudios: req.session.planEstudios
                })
        } else {
            res.redirect("" + req.baseUrl + "/respDoc/profesores?pdID=" + pdID + "&departamentoID=" + departamentoID + "&planAcronimo=" + planAcronimo)
        }
    

}
    
//POST respDoc/guardarAsignacion
exports.guardarAsignacion = function (req, res, next){
        req.session.submenu = "Profesores"
        let whereEliminar={};
        let coordinador = req.session.profesores.find(function (obj) { return obj.nombre === req.body.coordinador; });
        let identificador = Number(req.body.asignaturaId)
        let pdID = req.body.pdID
        let planAcronimo = req.body.planAcronimo
        let departamentoID = req.session.departamentoID
    if (!res.locals.permisoDenegado) {
            if (coordinador) {
                models.Asignatura.update(
                    { CoordinadorAsignatura: coordinador.correo }, /* set attributes' value */
                    { where: { identificador: identificador } } /* where criteria */
                ).then(() => {
                    paso2();
                })
            } else {
                paso2();
            }
            function paso2() {
                let toEliminar = req.body.eliminar
                if (toEliminar) {
                    if (!Array.isArray(toEliminar)) {
                        let asignacion = Number(toEliminar.split("_")[2])
                        whereEliminar.identificador = asignacion;
                    } else {
                        whereEliminar['$or'] = [];
                        toEliminar.forEach(function (element, index) {
                            let asignacion = Number(element.split("_")[2])
                            let nuevoFiltro = {};
                            nuevoFiltro.identificador = asignacion;
                            whereEliminar['$or'].push(nuevoFiltro);
                        });
                    }
                    models.AsignacionProfesor.destroy({
                        where: whereEliminar
                    }).then(() => {
                        paso3();
                    })
                } else {
                    paso3();
                }

                function paso3() {

                    let toAnadir = req.body.anadir;
                    let queryToAnadir = []
                    if (toAnadir) {
                        if (!Array.isArray(toAnadir)) {
                            let profesor = toAnadir.split("_")[3]
                            let nuevaEntrada = {};
                            nuevaEntrada.AsignaturaId = identificador;
                            nuevaEntrada.ProfesorId = profesor;
                            if (!isNaN(toAnadir.split("_")[2])) {
                                nuevaEntrada.GrupoId = Number(toAnadir.split("_")[2]);
                            }
                            queryToAnadir.push(nuevaEntrada);
                        } else {
                            toAnadir.forEach(function (element, index) {
                                let profesor = element.split("_")[3]
                                let nuevaEntrada = {};
                                nuevaEntrada.AsignaturaId = identificador;
                                if (!isNaN(element.split("_")[2])) {
                                    nuevaEntrada.GrupoId = Number(element.split("_")[2]);
                                }
                                nuevaEntrada.ProfesorId = profesor;
                                queryToAnadir.push(nuevaEntrada);
                            });
                        }
                    }
                    return models.AsignacionProfesor.bulkCreate(
                        queryToAnadir
                    ).then(() => { // Notice: There are no arguments here, as of right now you'll have to...
                        res.redirect("" + req.baseUrl + "/respDoc/profesores?pdID=" + pdID + "&departamentoID=" + departamentoID + "&planAcronimo=" + planAcronimo)
                    })

                }
            }
        } else {
            res.redirect("" + req.baseUrl + "/respDoc/profesores?pdID=" + pdID + "&departamentoID=" + departamentoID + "&planAcronimo=" + planAcronimo)
        }           
}
// post respDoc/aprobarAsignacion:pdID
exports.aprobarAsignacion = function(req,res,next){
    let pdID = req.body.pdID;
    let departamentoID = req.body.departamentoID;
    let date = new Date();
    let planAcronimo = req.session.planAcronimo;
    let estadoProfesores;
    models.ProgramacionDocente.findOne({ where: { identificador: pdID } }).then(function (pd) {
        estadoProfesores = pd['estadoProfesores']
        if (!res.locals.permisoDenegado) {
            switch (estadoProfesores[departamentoID]) {
                case (estados.estadoProfesor.abierto):
                    estadoProfesores[departamentoID] = estados.estadoProfesor.aprobadoResponsable;
                    break;
                case (estados.estadoProfesor.aprobadoResponsable):
                    req.body.decision !== 'aceptar' ? estadoProfesores[departamentoID] = estados.estadoProfesor.abierto : estadoProfesores[departamentoID] = estados.estadoProfesor.aprobadoDirector
                    break;
            }

            models.ProgramacionDocente.update(
                {
                    estadoProfesores: estadoProfesores,
                    fechaProfesores: date
                }, /* set attributes' value */
                { where: { identificador: pdID } } /* where criteria */
            ).then(() => {

                //tendrás que crear un mensaje para cada tipo de estadoProf
                /*
                let subject = "Cambio estado programación docente " + planAcronimo
                let text = "El responsable docente ha aprobado la asignación de profesores del plan " +planAcronimo+". Debe revisarla y aceptarla en caso de que sea correcta."
                let mailOptions = {
                    from: 'javier.conde.diaz@alumnos.upm.es',
                    to: 'javier.conde.diaz@alumnos.upm.es',
                    subject: subject,
                    text: text
                };
        
                mail.mailTransporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
                */
                JEcontroller.isPDLista(pdID, res.redirect("" + req.baseUrl + "/Cumplimentar"))
            })
        } else {
            JEcontroller.isPDLista(pdID, res.redirect("" + req.baseUrl + "/Cumplimentar"))
        }

    })
  
}

// GET respDoc/tribunales:pdID/:departamentoID
exports.getTribunales = function (req, res, next){
    req.session.submenu ="Tribunales"

    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
        let view = req.originalUrl.toLowerCase().includes("/consultar/") ? "tribunalesConsultar" : "tribunales"
        res.render(view, {
            estado: "Programacion docente no abierta",
            permisoDenegado: res.locals.permisoDenegado,
            profesores: null,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planAcronimo: req.session.planAcronimo,
            departamentoID: req.session.departamentoID,
            departamentosResponsables: res.locals.departamentosResponsables,
            estadosTribunal : estados.estadoTribunal,
            estadosProgDoc: estados.estadoProgDoc,
            planEstudios: req.session.planEstudios
        })
    }
    //hay que comprobar que no sea una url de consultar.
    else if (!comprobarEstadoCumpleUno(estados.estadoTribunal.abierto, res.locals.progDoc['ProgramacionDocentes.estadoTribunales']) 
    && !comprobarEstadoCumpleUno(estados.estadoTribunal.aprobadoResponsable, res.locals.progDoc['ProgramacionDocentes.estadoTribunales']) 
        && res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] === estados.estadoProgDoc.abierto && !req.originalUrl.toLowerCase().includes("/consultar/") ) {
        res.render("tribunales", {
            estado: "Asignación de tribunales ya se realizó",
            permisoDenegado: res.locals.permisoDenegado,
            profesores: null,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planAcronimo: req.session.planAcronimo,
            departamentoID: req.session.departamentoID,
            departamentosResponsables: res.locals.departamentosResponsables,
            estadosTribunal: estados.estadoTribunal,
            estadosProgDoc: estados.estadoProgDoc,
            planEstudios: req.session.planEstudios
        })
    }       
    else {
        req.session.tribunales = [];
        let pdID = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.identificador']
        //sino se especifica departamento se queda con el primero del plan responsable. Arriba comprobé que existe el departamento en la pos 0.
        let departamentoID = req.session.departamentoID ? req.session.departamentoID : res.locals.departamentosResponsables[0].codigo;
        //si no estaba inicializada la inicializo.
        req.session.departamentoID = departamentoID;
        let departamentoExisteEnElPlan = res.locals.departamentosResponsables.find(function (obj) { return obj.codigo === departamentoID; });
        if (!departamentoExisteEnElPlan) {
            let view = req.originalUrl.toLowerCase().includes("/consultar/") ? "tribunalesConsultar" : "tribunales"
            res.render(view, {
                estado: "El departamento seleccionado no es responsable de ninguna asignatura del plan",
                permisoDenegado: res.locals.permisoDenegado,
                profesores: null,
                menu: req.session.menu,
                submenu: req.session.submenu,
                planAcronimo: req.session.planAcronimo,
                departamentoID: req.session.departamentoID,
                departamentosResponsables: res.locals.departamentosResponsables,
                estadosTribunal: estados.estadoTribunal,
                estadosProgDoc: estados.estadoProgDoc,
                planEstudios: req.session.planEstudios
            })
        }else{
            if (res.locals.permisoDenegado) {
                let view = req.originalUrl.toLowerCase().includes("/consultar/") ? "tribunalesConsultar" : "tribunales"
                res.render(view, {
                    estado: null,
                    permisoDenegado: res.locals.permisoDenegado,    
                    profesores: null,
                    menu: req.session.menu,
                    submenu: req.session.submenu,
                    planAcronimo: req.session.planAcronimo,
                    departamentoID: req.session.departamentoID,
                    departamentosResponsables: res.locals.departamentosResponsables,
                    estadosTribunal: estados.estadoTribunal,
                    estadosProgDoc: estados.estadoProgDoc,
                    planEstudios: req.session.planEstudios
                })
            }  
            else if (req.session.profesores) {
                getMiembrosTribunal(pdID, departamentoID);
            } else {
                req.session.profesores = [];
                models.Persona.findAll({
                    attributes: ['email', 'nombre', 'apellido'],
                    //inner join
                    include: [{
                        model: models.Profesor,
                        required: true,
                    }],
                    raw: true
                })
                    .each(function (profesor) {
                        let nombre = profesor['apellido'] + " " + profesor['nombre']
                        let correo = profesor['email']
                        let nombreCorregido = profesor['apellido'] + "," + profesor['nombre']
                        nombreCorregido = funciones.primerasMayusc(nombreCorregido)
                        let prof = { nombre: nombre, correo: correo, nombreCorregido: nombreCorregido }
                        req.session.profesores.push(prof);
                    })
                    .then(function (params) {
                        //console.log(req.session.profesores);
                        getMiembrosTribunal(pdID, departamentoID);
                    })
                    .catch(function (error) {
                        console.log("Error:", error);
                    });
            }

            function getMiembrosTribunal(ProgramacionDocenteIdentificador, DepartamentoResponsable) {
                req.session.submenu = "Tribunales"
                models.Asignatura.findAll({
                    where: {
                        //se obtendrá con req D510 1
                        ProgramacionDocenteIdentificador: ProgramacionDocenteIdentificador,
                        DepartamentoResponsable: DepartamentoResponsable
                    },
                    attributes: ['acronimo', 'curso', 'identificador', 'PresidenteTribunalAsignatura', 'VocalTribunalAsignatura', 'SecretarioTribunalAsignatura', 'SuplenteTribunalAsignatura', 'nombre'],
                    order: [

                        [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
                        [Sequelize.literal('"Asignatura"."acronimo"'), 'ASC']
                    ],
                    raw: true,
                })
                    .each(function (ej) {
                        let presidente = req.session.profesores.find(function (obj) { return obj.correo === ej['PresidenteTribunalAsignatura']; });
                        if (presidente) {
                            ej.presidenteNombre = presidente.nombreCorregido
                        }
                        let vocal = req.session.profesores.find(function (obj) { return obj.correo === ej['VocalTribunalAsignatura']; });
                        if (vocal) {
                            ej.vocalNombre = vocal.nombreCorregido
                        }
                        let secretario = req.session.profesores.find(function (obj) { return obj.correo === ej['SecretarioTribunalAsignatura']; });
                        if (secretario) {
                            ej.secretarioNombre = secretario.nombreCorregido
                        }
                        let suplente = req.session.profesores.find(function (obj) { return obj.correo === ej['SuplenteTribunalAsignatura']; });
                        if (suplente) {
                            ej.suplenteNombre = suplente.nombreCorregido
                        }
                        ej.tribunalId = ej['identificador'];


                    })
                    .then(function (e) {
                        //console.log(req.originalUrl)
                        //console.log(req.baseUrl)
                        //console.log(req.path)
                        let view = req.originalUrl.toLowerCase().includes("/consultar/") ? "tribunalesConsultar" : "tribunales"
                        let nuevopath = "" + req.baseUrl + "/respdoc/guardarTribunales"
                        let cancelarpath = "" + req.baseUrl + "/respdoc/tribunales?planAcronimo=" + req.session.planAcronimo + "&departamentoID=" + DepartamentoResponsable
                        res.render(view,
                            {
                                profesores: req.session.profesores,
                                tribunales: e,
                                nuevopath: nuevopath,
                                aprobarpath: "" + req.baseUrl + "/respDoc/aprobarTribunales",
                                cancelarpath: cancelarpath,
                                planAcronimo: req.session.planAcronimo,
                                estadoTribunales: res.locals.progDoc['ProgramacionDocentes.estadoTribunales'],
                                estadoProgDoc: res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'],
                                pdID: pdID,
                                submenu: req.session.submenu,
                                menu: req.session.menu,
                                estado: null,
                                permisoDenegado: res.locals.permisoDenegado,
                                departamentoID: req.session.departamentoID,
                                departamentosResponsables: res.locals.departamentosResponsables,
                                estadosTribunal: estados.estadoTribunal,
                                estadosProgDoc: estados.estadoProgDoc,
                                planEstudios: req.session.planEstudios
                            })
                    })
            }
        }
    }
}

//POST respDoc/guardarTribunales
exports.guardarTribunales = function (req, res, next) {
    req.session.submenu = "Tribunales"
    let planAcronimo = req.session.planAcronimo;
    let departamentoID = req.session.departamentoID;
    let pdID = req.body.pdID;
    let toActualizar = req.body.actualizar;      
        if (toActualizar && !res.locals.permisoDenegado) {
            if (!Array.isArray(toActualizar)) {
                let tribunalId = Number(toActualizar.split("_")[0])
                let profesorCorreo = toActualizar.split("_")[1]
                let puestoTribunal = toActualizar.split("_")[2] + "TribunalAsignatura"
                let nuevaEntrada = {};
                nuevaEntrada[puestoTribunal] = profesorCorreo;
                return models.Asignatura.update(
                    nuevaEntrada, /* set attributes' value */
                    { where: { identificador: tribunalId } } /* where criteria */
                ).then(() => {
                    next();
                })
            } else {
                let promises = [];
                let tribunalesToActualizar = [];
                toActualizar.forEach(function (element, index) {
                    let tribunalToActualizar;
                    let tribunalId = Number(element.split("_")[0])
                    let profesorCorreo = element.split("_")[1]
                    let puestoTribunal = element.split("_")[2] + "TribunalAsignatura"
                    tribunalToActualizar = tribunalesToActualizar.find(function (obj) { return obj.identificador === tribunalId; });
                    if (tribunalToActualizar) {
                        tribunalToActualizar.puestos[puestoTribunal] = profesorCorreo;
                    }
                    else {
                        tribunalToActualizar = {}
                        tribunalToActualizar.identificador = tribunalId;
                        tribunalToActualizar.puestos = {}
                        tribunalToActualizar.puestos[puestoTribunal] = profesorCorreo
                        tribunalesToActualizar.push(tribunalToActualizar)
                    }

                });
                tribunalesToActualizar.forEach(function (element, index) {
                    promises.push(models.Asignatura.update(
                        tribunalesToActualizar[index].puestos,
                        { where: { identificador: tribunalesToActualizar[index].identificador } }
                    ))

                })

                return Promise.all(promises).then(() => {
                    next()
                });

            }
        } else {
            next()
        }
}

//get
exports.reenviar = function(req,res,next){
    res.redirect("" + req.baseUrl + "/respDoc/tribunales?departamentoID=" + req.session.departamentoID + "&planAcronimo=" + req.session.planAcronimo)
}
// post respDoc/aprobarTribunales:pdID
exports.aprobarTribunales = function (req, res, next) {
    let pdID = req.body.pdID;
    let departamentoID = req.body.departamentoID;
    let date = new Date();
    let planAcronimo = req.session.planAcronimo;
    let estadoTribunales;
    models.ProgramacionDocente.findOne({ where: { identificador: pdID } }).then(function (pd) {
        estadoTribunales = pd['estadoTribunales']
        if (!res.locals.permisoDenegado){
            switch (estadoTribunales[departamentoID]) {
                case (estados.estadoTribunal.abierto):
                    estadoTribunales[departamentoID] = estados.estadoTribunal.aprobadoResponsable;
                    break;
                case (estados.estadoTribunal.aprobadoResponsable):
                    req.body.decision !== 'aceptar' ? estadoTribunales[departamentoID] = estados.estadoTribunal.abierto : estadoTribunales[departamentoID] = estados.estadoTribunal.aprobadoDirector
                    break;
            }

            return models.ProgramacionDocente.update(
                {
                    estadoTribunales: estadoTribunales,
                    fechaTribunales: date
                }, /* set attributes' value */
                { where: { identificador: pdID } } /* where criteria */
            ).then(() => {
                //tendrás que crear un mensaje para cada tipo de estadoProf
                /*
                let subject = "Cambio estado programación docente " + planAcronimo
                let text = "El responsable docente ha aprobado la asignación de profesores del plan " +planAcronimo+". Debe revisarla y aceptarla en caso de que sea correcta."
                let mailOptions = {
                    from: 'javier.conde.diaz@alumnos.upm.es',
                    to: 'javier.conde.diaz@alumnos.upm.es',
                    subject: subject,
                    text: text
                };
        
                mail.mailTransporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
                */
                JEcontroller.isPDLista(pdID, res.redirect("" + req.baseUrl + "/Cumplimentar"))
            })
        }else{
            JEcontroller.isPDLista(pdID, res.redirect("" + req.baseUrl + "/Cumplimentar"))
        }

    }) 
}

/*
    models.Asignatura.findAll({
        attributes: ["nombre"],   
        include: [{
            model: models.Horario, attributes:['GrupoGrupoId'],
            include: [{
                model: models.AsignacionProfesor
            }]
        }]
    })
        .each(function (horario) {
            console.log("aaaaaa")
            console.log(horario);
            
        })
        .catch(function (error) {
            console.log("Error:", error);
});
  */ 
    /*
    //el plan de estudio se supone que vendrá de req, aqui lo supongo 1, al igual que departamentos
    let asignaciones=[]
    let profesores = [] 
    //falta comprobar si está autorizado
    models.Profesor.findAll()
        .then(prof => {
            profesores = prof;
            console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
            console.log(profesores);
            console.log(asignaciones);
            if (asignaciones.length >0 && profesores.length>0){
                console.log(asignaciones);
                console.log(profesores);
                res.render('responsableDep.ejs', {
                    profesores: profesores,
                    //paso las asignaturas con los profesores
                    asignaciones: asignaciones
                });           
            }

        })
    models.Asignatura.findAll({
        where: {
            ProgramacionDocenteIdentificador: '1',
            DepartamentoResponsable: '1'
        }
    })
        .each(function (asignatura) {
                let asig={};
                let asignaturaId = asignatura.identificador;
                let profesores = [];
            return models.sequelize.query('SELECT distinct("ProfesorProfesorEmail", "AsignaturaIdentificador") FROM public."Horarios" t1   RIGHT JOIN public."Asignaturas" t2 ON t1."AsignaturaIdentificador" = t2."identificador" WHERE t2."identificador" = :asignaturaId',
                { replacements: { asignaturaId: asignaturaId }}
                ).then(projects => {
                    projects[0].forEach(function (e){
                        profesor = e.row.split("(")[1].split(",")[0];
                        if(profesor!=="")
                            profesores.push(profesor);
                        
                    })
                    asig.asignatura=asignatura;
                    asig.profesores=profesores;
                    asignaciones.push(asig);
                })
            })
            .then(function(a){
                console.log("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")
                console.log(profesores);
                console.log(asignaciones);
                if (asignaciones.length > 0 && profesores.length > 0) {
                    console.log(asignaciones);
                    console.log(profesores);
                    res.render('responsableDep.ejs', {
                        profesores: profesores,
                        //paso las asignaturas con los profesores
                        asignaciones: asignaciones
                    });
                }    
            
        })
        .catch(function (error) {
            next(error);
        });
*/       


//funcion para ver el estado de profesores o tribunales si cumple uno el resto lo marca como cumplido
function comprobarEstadoCumpleUno(estado, objeto){ 
    for (variable in objeto ){
        if(objeto[variable] === estado){
            return true;
        }
    }
    return false;
}
    