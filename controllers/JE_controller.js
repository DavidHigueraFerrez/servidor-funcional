let app = require('../app')
let models = require('../models');
let Sequelize = require('sequelize');
const nodemailer = require('nodemailer');
let mail = require('../mail/mail');
const op = Sequelize.Op;
let estados = require('../estados');
const axios = require('axios');
//concurrencia de tipo A-->B-->C--> 
//                                 ----->F
//                     D--->E----->   
exports.gestionProgDoc = function (req, res, next) {
    req.session.submenu ="AbrirCerrar"
    let nuevosPlanes = [];
    let planes = [];
    let pds = [];
    let promises = [];
    let anos = [];
    let promise1 = axios.get('https://www.upm.es/wapi_upm/academico/comun/index.upm/v2/centro.json/9/departamentos')
        .then(function (response) {
            let apiDepartamentos = response.data;
            let nuevosDepartamentos = [];
            return models.Departamento.findAll({
                attributes: ["codigo", "nombre"],
                raw: true
            }).then(function (departamentosBBDD) {
                apiDepartamentos.forEach(function (apiDepartamento) {
                    let departamentoBBDD = departamentosBBDD.find(function (obj) { return obj.codigo === apiDepartamento.codigo });
                    if (!departamentoBBDD) {
                        let nuevoDepartamento = {};
                        nuevoDepartamento.codigo = apiDepartamento.codigo;
                        //TODO: descomentar
                        //nuevoDepartamento.nombre = apiDepartamento.nombre;
                        nuevosDepartamentos.push(nuevoDepartamento);
                    }
                })
                return models.Departamento.bulkCreate(
                    nuevosDepartamentos
                ).then(() => { 
                    console.log(nuevosDepartamentos)
                })
            })
                

                
        })
    //veo si hay algún 
     //compruebo que no hay ningún plan nuevo
    //los planes viejos no desaparecen se debería hacer manualmente pq el año actual igual si que se necesita
    let promise2 = axios.get("https://www.upm.es/wapi_upm/academico/comun/index.upm/v2/centro.json/9/planes/PSC")
    .then(function (response) {
        //obtengo las pd abiertas o con incidencias
        let apiPlanes = response.data;
        return models.PlanEstudio.findAll({
            attributes: ["codigo", "nombre"],
            raw: true
        }).then(function (planesBBDD) {
            apiPlanes.forEach(function(apiPlan){
                let planBBDD = planesBBDD.find(function (obj) { return obj.codigo === apiPlan.codigo });
                if(!planBBDD){
                    let nuevoPlan = {};
                    nuevoPlan.codigo = apiPlan.codigo;
                    nuevoPlan.nombreCompleto = apiPlan.nombre;
                    // falta el acronimo del plan
                    nuevoPlan.nombre = null;
                    nuevosPlanes.push(nuevoPlan);
                }
            })
            planes = planes.concat(planesBBDD);
            planes = planes.concat(nuevosPlanes);
            return models.PlanEstudio.bulkCreate(
                nuevosPlanes
            ).then(() => {
                //¿Podría marcar una incidencia con algo ya abierto ¿? Si es así cambiar esto. Obtengo la ultima pd
                // el order by es la clave si ya abrí una anual no voy a poder abrir una semestral después. Debe seguir el orden
                return models.sequelize.query(query = 'SELECT   "PlanEstudioId", "identificador", "semestre", "anoAcademico", "estadoProGDoc" FROM public."ProgramacionDocentes" p   ORDER BY p."identificador" DESC ', 
                ).then(pdsBBDD => {
                    pdsBBDD[0].forEach(function (pdBBDD){
                        let existentePD = pds.find(function (obj) { return obj.PlanEstudioId === pdBBDD.PlanEstudioId });
                        if (!existentePD) {
                            pds.push({ PlanEstudioId: pdBBDD.PlanEstudioId, identificador:pdBBDD.identificador, estadoProGDoc: pdBBDD.estadoProGDoc, 
                                anoAcademico: pdBBDD.anoAcademico, siguienteAnoAcademico: siguienteAnoAcademico(pdBBDD.anoAcademico), semestre: pdBBDD.semestre, });
                        }
                    })
                    // puede haber planes sin pd, como los nuevos planes u otras cosas
                    planes.forEach(function (plan) {
                        let existentePD = pds.find(function (obj) { return obj.PlanEstudioId === plan.codigo });
                        if(existentePD){
                            existentePD.nombre = plan.nombre;
                        }
                        else{
                            pds.push({PlanEstudioId:plan.codigo, identificador: null, estadoProGDoc: estados.estadoProgDoc.cerrado, nombre: plan.nombre, 
                                anoAcademico: null, siguienteAnoAcademico:null, semestre:null }) //estado cerrado en caso de que no haya ninguan pd en el sistema
                        }
                    })
                    //console.log(pds);
                    let year = new Date().getFullYear();
                    let siguiente = year + 1;
                    let siguiente2 = year + 2;
                    anos.push("" + year + "" + siguiente.toString().substr(-2));
                    anos.push("" + siguiente + "" + siguiente2.toString().substr(-2));                    
                })

            })
        })
    })
    promises.push(promise1);
    promises.push(promise2);
    return Promise.all(promises).then(() => {
        res.render("abrirCerrarPds", {
            planes: planes,
            pds: pds, estadosProgDoc: estados.estadoProgDoc,
            anos: anos,
            consultarpath: "",
            abrirpath: "" + req.baseUrl +"/abrirProgdoc",
            cerrarpath: "" + req.baseUrl + "/cerrarProgdoc",
            submenu: req.session.submenu,
            menu: req.session.menu,
            planAcronimo: req.session.planAcronimo,
          })
    });
}

function siguienteAnoAcademico(anoActual) {
    let year = Number(anoActual.substr(0, 4));
    let siguiente = year + 1;
    let siguiente2 = year + 2;
    return ("" + siguiente + "" + siguiente2.toString().substr(-2));
}