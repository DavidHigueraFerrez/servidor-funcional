let app = require('../app')
let models = require('../models');
let Sequelize = require('sequelize');
const nodemailer = require('nodemailer');
let mail = require('../mail/mail');
const op = Sequelize.Op;
let estados = require('../estados');

exports.getGrupos = function (req, res, next) {
    req.session.submenu = "Grupos"
    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
        res.render("gruposJE", {
            estado: "Programacion docente no abierta",
            menu: req.session.menu,
            submenu: req.session.submenu,
            planAcronimo: req.session.planAcronimo,
            departamentosResponsables: res.locals.departamentosResponsables,
            planEstudios: req.session.planEstudios,
            grupos: null
        })
    }
    else if (estados.estadoProgDoc.abierto !== res.locals.progDoc['ProgramacionDocentes.estadoHorarios'] && estados.estadoProgDoc.listo !== res.locals.progDoc['ProgramacionDocentes.estadoHorarios']) {
        res.render("gruposJE", {
            estado: "Programacion docente no abierta",
            menu: req.session.menu,
            submenu: req.session.submenu,
            planAcronimo: req.session.planAcronimo,
            departamentosResponsables: res.locals.departamentosResponsables,
            planEstudios: req.session.planEstudios,
            grupos: null
        })
    } else {
        let cursosConGrupos = [];
        let pdID = res.locals.progDoc['ProgramacionDocentes.identificador']
        //obtengo los cursos que hay en el plan por las asignaturas que tiene el plan
        models.sequelize.query(query = 'SELECT distinct  "curso" FROM public."Asignaturas" a  WHERE (a."ProgramacionDocenteIdentificador" = :pdID) ORDER BY a."curso" ASC;',
            { replacements: { pdID: pdID } }
        ).then(cursos => {
            cursos[0].forEach(function (c) {
                let nuevoCurso = {}
                nuevoCurso.curso = Number(c.curso)
                switch (pdID.split("_")[3]) {
                    case '1S':
                        nuevoCurso.semestres = [{ semestre: 1, grupos: [] }];
                        break;
                    case '2S':
                        nuevoCurso.semestres = [{ semestre: 2, grupos: [] }];
                        break;
                    default:
                        nuevoCurso.semestres = [{ semestre: 1, grupos: [] }, { semestre: 2, grupos: [] }];
                        break;
                }

                cursosConGrupos.push(nuevoCurso);
            })
            return models.Grupo.findAll({
                where: {
                    ProgramacionDocenteId: pdID
                },
                order: [
                    [Sequelize.literal('"grupoId"'), 'ASC'],
                ],
                raw: true
            }).each((g) => {
                let curso = cursosConGrupos.find(function (obj) { return obj.curso === g.curso; });
                if (curso) {
                    let semestre = curso.semestres.find(function (obj) { return obj.semestre === Number(g.nombre.split(".")[1]) })
                    if (semestre) {
                        semestre.grupos.push(g)
                    }
                }
            })
                .then((grupos) => {
                    //console.log(cursosConGrupos);
                    //console.log(cursosConGrupos[0].semestres[0])
                    let nuevopath = "" + req.baseUrl + "/gestionGrupos/guardarGruposJE"
                    res.render("gruposJE", {
                        estado: null,
                        menu: req.session.menu,
                        submenu: req.session.submenu,
                        nuevopath: nuevopath,
                        planAcronimo: req.session.planAcronimo,
                        departamentosResponsables: res.locals.departamentosResponsables,
                        planEstudios: req.session.planEstudios,
                        grupos: cursosConGrupos,
                        pdID: pdID
                    })
                })
        })

    }
}

exports.EliminarGruposJE = function (req, res, next) {
    req.session.submenu = "Grupos"
    let planAcronimo = req.session.planAcronimo;
    let pdID = req.body.pdID;
    let toEliminar = req.body.eliminar;
    let promises = [];
    if (toEliminar) {
        let whereEliminar = {};
        let whereEliminar2 = {};
        if (!Array.isArray(toEliminar)) {
            let grupoId = Number(toEliminar.split("_")[1])
            whereEliminar.grupoId = grupoId;
            whereEliminar2.GrupoId = grupoId;
        } else {
            whereEliminar['$or'] = [];
            whereEliminar2['$or'] = [];
            toEliminar.forEach(function (element, index) {
                let grupoId = Number(element.split("_")[1])
                let nuevoFiltro = {};
                nuevoFiltro.grupoId = grupoId;
                let nuevoFiltro2 = {}
                nuevoFiltro2.GrupoId = grupoId;
                whereEliminar['$or'].push(nuevoFiltro);
                whereEliminar2['$or'].push(nuevoFiltro2);
            });
        }
        //antes de borrarlo de grupos voy a borrarlo de las asignaciones
        models.AsignacionProfesor.destroy({
            where: whereEliminar2
        }).then(() => {
            models.Grupo.destroy({
                where: whereEliminar
            }).then(() => {
                next();
            })
        })

    } if (!toEliminar) {
        next();
    }
}

exports.ActualizarGruposJE = function (req, res, next) {
    req.session.submenu = "Grupos"
    let planAcronimo = req.session.planAcronimo;
    let pdID = req.body.pdID;
    let toActualizar = req.body.actualizar;
    let promises = [];
    if (toActualizar) {
        if (!Array.isArray(toActualizar)) {
            let grupoId = Number(toActualizar.split("_")[1])
            let nombre = toActualizar.split("_")[2]
            let capacidad = Number(req.body['grupo_' + nombre + '_capacidad'])
            let aula = req.body['grupo_' + nombre + '_aula']
            let nuevaEntrada = {};
            nuevaEntrada.capacidad = capacidad;
            nuevaEntrada.aula = aula;
            promises.push(models.Grupo.update(
                nuevaEntrada, /* set attributes' value */
                { where: { grupoId: grupoId } } /* where criteria */
            ))
        } else {
            let gruposToActualizar = [];
            toActualizar.forEach(function (element, index) {
                let grupoToActualizar;
                let grupoId = Number(element.split("_")[1])
                let nombre = element.split("_")[2]
                let capacidad = Number(req.body['grupo_' + nombre + '_capacidad'])
                let aula = req.body['grupo_' + nombre + '_aula']
                grupoToActualizar = {}
                grupoToActualizar.capacidad = capacidad;
                grupoToActualizar.aula = aula;
                gruposToActualizar.push(grupoToActualizar)
                promises.push(models.Grupo.update(
                    grupoToActualizar,
                    { where: { grupoId: grupoId } }
                ))
            });
        }
    } else {

    }
    Promise.all(promises).then(() => {
        next();
    })
}


exports.AnadirGruposJE = function (req, res, next) {
    req.session.submenu = "Grupos"
    let planAcronimo = req.session.planAcronimo;
    let pdID = req.body.pdID;
    let toAnadir = req.body.anadir;
    let gruposToAnadir = [];
    let asignacionsToAnadir = [];
    if (toAnadir) {
        if (!Array.isArray(toAnadir)) {
            let nombre = toAnadir.split("_")[2];
            let newGrupo = {};
            newGrupo.nombre = nombre;
            newGrupo.capacidad = Number(req.body['grupo_' + nombre + '_capacidad']);
            newGrupo.curso = Number(toAnadir.split("_")[3]);
            newGrupo.aula = req.body['grupo_' + nombre + '_aula'];
            newGrupo.ProgramacionDocenteId = pdID;
            gruposToAnadir.push(newGrupo)
        } else {
            toAnadir.forEach(function (element, index) {
                let nombre = element.split("_")[2]
                let newGrupo = {};
                newGrupo.nombre = nombre;
                newGrupo.capacidad = Number(req.body['grupo_' + nombre + '_capacidad']);
                newGrupo.curso = Number(element.split("_")[3]);
                newGrupo.aula = req.body['grupo_' + nombre + '_aula'];
                newGrupo.ProgramacionDocenteId = pdID;
                gruposToAnadir.push(newGrupo)
            });
        }
    } else {

    }
    models.Grupo.bulkCreate(
        gruposToAnadir
    ).then(() => {
        return models.Grupo.findAll({
            attributes: ["grupoId", "nombre", "curso"],
            where: {
                ProgramacionDocenteId: pdID
            },
            raw: true
        }).then((grupos) => {
            return models.Asignatura.findAll({
                where: { ProgramacionDocenteIdentificador: pdID },
                raw: true

            }).each(function (asignBBDD) {
                gruposToAnadir.forEach(function (g) {
                    let grupoBBDD = grupos.find(function (obj) { return obj.nombre === g.nombre; });
                    let condicion2 = false;
                    switch (asignBBDD.semestre) {
                        case "1S":
                            condicion2 = Number(g.nombre.split(".")[1]) === 1 ? true : false;
                            break;
                        case "2S":
                            condicion2 = Number(g.nombre.split(".")[1]) === 2 ? true : false;
                            break;
                        default:
                            condicion2 = true;
                            break;
                    }
                    if (Number(grupoBBDD.curso) === Number(asignBBDD.curso) && condicion2) {
                        let nuevaAsignacion = {};
                        nuevaAsignacion.AsignaturaId = asignBBDD.identificador;
                        nuevaAsignacion.GrupoId = grupoBBDD.grupoId
                        asignacionsToAnadir.push(nuevaAsignacion);
                    }

                })
            }).then(() => {
                models.AsignacionProfesor.bulkCreate(
                    asignacionsToAnadir
                ).then(() => {
                    res.redirect("" + req.baseUrl + "/gestionGrupos/getGrupos?planAcronimo=" + planAcronimo)
                })
            })
        })
    })
}


