let app = require('../app')
let models = require('../models');
let Sequelize = require('sequelize');

exports.getPlanes = function (req, res, next){
        models.PlanEstudio.findAll({
        attributes: ["codigo", "nombre", "nombreCompleto"],
        raw: true
    }).then(function (planesBBDD) {
        req.session.planEstudios = planesBBDD;
        res.render('cumplimentar', {
            menu: req.session.menu,
            path: req.baseUrl,
            planEstudios: req.session.planEstudios
        });
    })
}

exports.anadirProfesor = function (req, res, next){
        let personaToAnadir = [];
        let profesorToAnadir = [];
        let profesoresNuevos = req.body.nuevoProfesor;
        console.log(profesoresNuevos)
    
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
                    let prof = { nombre: nombre, correo: correo }
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