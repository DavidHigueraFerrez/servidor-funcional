let app = require('../app')
let models = require('../models');
let Sequelize = require('sequelize');
let moment = require('moment')
const nodemailer = require('nodemailer');
let mail = require('../mail/mail');
const op = Sequelize.Op;
let estados = require('../estados');
let enumsPD = require('../enumsPD');
let JEcontroller = require('./JE_controller')

exports.getEstado = function (req, res, next) {
    req.session.submenu = "Estado"
    console.log(res.locals.progDoc)
    console.log(res.locals.departamentosResponsables)
    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc
    if (!res.locals.progDoc || !res.locals.departamentosResponsables) {
        let view = req.originalUrl.toLowerCase().includes("/consultar/") ? "estadoConsultar" : "estado"
        res.render(view, {
            estado: "Programacion docente no abierta",
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planAcronimo: req.session.planAcronimo,
            departamentoID: req.session.departamentoID,
            planEstudios: req.session.planEstudios,
        })
    }else{
        let pdID = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.identificador']
        let departamentoID = req.session.departamentoID ? req.session.departamentoID : res.locals.departamentosResponsables[0].codigo;
        //si no estaba inicializada la inicializo.
        req.session.departamentoID = departamentoID;
        let view = req.originalUrl.toLowerCase().includes("/consultar/") ? "estadoConsultar" : "estado"
        res.render(view, {
            estado: null,
            permisoDenegado: res.locals.permisoDenegado,
            menu: req.session.menu,
            submenu: req.session.submenu,
            planAcronimo: req.session.planAcronimo,
            departamentoID: req.session.departamentoID,
            planEstudios: req.session.planEstudios,
            pdID : pdID
        })

    }
}