let app = require('../app')
let models = require('../models');
let Sequelize = require('sequelize');
let estados = require('../estados');
let funciones = require('../funciones');

exports.getPlanes = function (req, res, next){
        models.PlanEstudio.findAll({
        attributes: ["codigo", "nombre", "nombreCompleto"],
        raw: true
    }).then(function (planesBBDD) {
        req.session.planEstudios = planesBBDD;
        next();
    })
}

exports.getProgramacionDocente = function (req, res, next) {
    let planAcronimo = req.query.planAcronimo;
    if (!planAcronimo){
        planAcronimo = req.session.planAcronimo
    }
    if(!planAcronimo){
        planAcronimo = "GITST"
    }
    let departamentoID = req.query.departamentoID;
    //separar con un if el rol en el que el where afecta
    let wherePD = {};
    wherePD['$or'] = [];
    wherePD['$or'].push({ estadoProGDoc: estados.estadoProgDoc.abierto});
    wherePD['$or'].push({ estadoProGDoc: estados.estadoProgDoc.incidencia });
    if (departamentoID) {
        req.session.departamentoID = departamentoID;
    }else{
        req.session.departamentoID = "D520";
    }
    //el planAcronimo si no existe acronimo sera el código, por eso el or
    if (planAcronimo) {
        req.session.planAcronimo = planAcronimo
        models.PlanEstudio.findAll({
            attributes: ['nombre', 'codigo'],
            where: Sequelize.or(
                { nombre: planAcronimo },
                { codigo: planAcronimo }
            )
            ,
            include: [{
                model: models.ProgramacionDocente,
                where:wherePD
            }],
            raw: true
        })
            .then(function (params) {
                let progDocIncidencia = null;
                let progDocAbierta = null;
                params.forEach(function (param){
                    req.session.planCodigo = param['codigo'];
                    req.session.pdID = param['ProgramacionDocentes.identificador']
                    res.locals.pdSemestre = param['ProgramacionDocentes.semestre']
                    switch (param['ProgramacionDocentes.estadoProGDoc']) {
                        case estados.estadoProgDoc.abierto:
                            progDocAbierta = param;
                            break;
                        case estados.estadoProgDoc.incidencia:
                            progDocIncidencia = param;
                            break;
                    }
                })
                if(progDocIncidencia !== null){
                    res.locals.progDoc = progDocIncidencia;
                }else{
                    res.locals.progDoc = progDocAbierta;
                }                
                if (res.locals.progDoc !== null) {
                    let query = 'SELECT distinct  "DepartamentoResponsable", public."Departamentos".nombre FROM public."Asignaturas" p  inner join public."Departamentos" on p."DepartamentoResponsable" = public."Departamentos".codigo WHERE p."ProgramacionDocenteIdentificador" = :pdId ';
                    return models.sequelize.query(query = query,
                        { replacements: { pdId: res.locals.progDoc['ProgramacionDocentes.identificador'] } },
                    ).then(departamentosResponsables => {
                        let depResponsables = [];
                        departamentosResponsables[0].forEach(function (d) {
                            let newDepartamento = {};
                            newDepartamento.nombre = d.nombre;
                            newDepartamento.codigo = d.DepartamentoResponsable;
                            depResponsables.push(newDepartamento)
                        })
                        if (depResponsables.length >= 0) {
                            res.locals.departamentosResponsables = depResponsables;
                            if (!departamentoID) {
                                req.session.departamentoID = depResponsables[0].codigo;
                            }
                        }

                        next();

                    })
                } else {
                    next();
                }
            })
            .catch(function (error) {
                console.log("Error:", error);
                next(error);
            });

    } else {
        delete req.session.planAcronimo
        next()
    }

}

exports.getGrupos = function (req, res, next) {
    if(res.locals.progDoc){
        let pdID = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.identificador']
        models.Grupo.findAll({
            attributes: ["nombre", "curso", "grupoId"],
            where: { ProgramacionDocenteId: pdID },
            order: [

                [Sequelize.literal("curso"), 'ASC'],
                [Sequelize.literal("nombre"), 'ASC']
            ],
            raw: true
        }).then(function (grupos) {
            res.locals.grupos = grupos;
            next();
        })
    }else{
        next();
    }
    
}

exports.getCumplimentar = function(req,res,next){
    res.redirect(app.contextPath + "estado")
}

exports.getConsultar = function (req, res, next) {
    res.redirect(app.contextPath + "consultar/estado")
}

exports.getGestion = function (req, res, next) {
    res.redirect(app.contextPath + "AbrirCerrar")
}

exports.getHistorial = function(req, res ,next){
    res.render('historial', {
        menu: req.session.menu,
        planAcronimo: req.session.planAcronimo,
        departamentosResponsables: res.locals.departamentosResponsables,
        planEstudios: req.session.planEstudios,
        PDsWithPdf: res.locals.PDsWithPdf,
        anosExistentes: res.locals.anosExistentes,
        pdSeleccionada: res.locals.pdSeleccionada
    })
}

exports.anadirProfesor = function (req, res, next){
        let personaToAnadir = [];
        let profesorToAnadir = [];
        let profesoresNuevos = req.body.nuevoProfesor;
        //console.log(profesoresNuevos)
    
    if (Array.isArray(profesoresNuevos)) {
        //borro los profesores pq pueden haber nuevos.
        delete req.session.profesores
        profesoresNuevos.forEach(function (value) {
            let nombre = value.split("_")[0]
            let apellido = value.split("_")[1];
            let correo = value.split("_")[2];
            let p = {};
            let prof = {};
            p.nombre = nombre;
            p.apellido = apellido;
            p.email = correo;
            prof.ProfesorEmail = correo;
            prof.DepartamentoCodigo = null;
            personaToAnadir.push(p);
            profesorToAnadir.push(prof);
        })
    } else if (profesoresNuevos){
        //borro los profesores pq pueden haber nuevos.
        delete req.session.profesores
        let nombre = profesoresNuevos.split("_")[0]
        let apellido = profesoresNuevos.split("_")[1];
        let correo = profesoresNuevos.split("_")[2];
        let p = {};
        let prof = {};
        p.nombre = nombre;
        p.apellido = apellido;
        p.email = correo;
        prof.ProfesorEmail = correo;
        prof.DepartamentoCodigo = null;
        personaToAnadir.push(p);
        profesorToAnadir.push(prof);
    }
    models.Persona.bulkCreate(
        personaToAnadir
    ).then(() => { // Notice: There are no arguments here, as of right now you'll have to...
        models.Profesor.bulkCreate(
            profesorToAnadir
        ).then(() => { // Notice: There are no arguments here, as of right now you'll have to...
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
                    let correo = profesor['email']
                    let nombreCorregido = profesor['apellido'] + "," + profesor['nombre']
                    nombreCorregido = funciones.primerasMayusc(nombreCorregido)
                    let prof = { nombre: nombre, correo: correo, nombreCorregido: nombreCorregido }
                    req.session.profesores.push(prof);

                }).then(() => {
                    next();
                })
        })
    })

}

/*
DELETE FROM public."Profesors"
 WHERE "ProfesorEmail"='juan@upm.es';

DELETE FROM public."Personas"
 WHERE email='juan@upm.es';
 */