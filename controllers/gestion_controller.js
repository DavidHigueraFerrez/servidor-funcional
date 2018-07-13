let app = require('../app')
let models = require('../models');
let Sequelize = require('sequelize');
const nodemailer = require('nodemailer');
let mail = require('../mail/mail');
const op = Sequelize.Op;
let estados = require('../estados');




exports.getProgramacionDocente = function (req, res, next){
    let planAcronimo = req.query.planAcronimo;
    if(planAcronimo){
        req.session.planAcronimo = planAcronimo
        models.PlanEstudio.findOne({
            attributes: ['nombre', 'codigo'],
            where: { nombre: planAcronimo },
            include: [{
                model: models.ProgramacionDocente,
                where: {
                    estadoProGDoc: 
                        estados.estadoProgDoc.abierto
                }
            }],
            raw: true
        })
            .then(function (param) {
                res.locals.progDoc = param;
                next()

            })
            .catch(function (error) {
                console.log("Error:", error);
                next(error);
            });

    }else{
        res.send("Programacíón docente no abierta.")
    }
   
}