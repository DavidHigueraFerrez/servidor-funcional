let app = require('../app')
let models = require('../models');
let Sequelize = require('sequelize');
const nodemailer = require('nodemailer');
let mail = require('../mail/mail');
const op = Sequelize.Op;
let estados = require('../estados');
const axios = require('axios');

//TODO: manejar tiempo de sesion
//concurrencia de tipo A-->B-->C--> 
//                                 ----->F
//                     D--->E----->   
exports.gestionProgDoc = function (req, res, next) {
    req.session.submenu ="AbrirCerrar"
    let nuevosPlanes = [];
    let planes = [];
    let pds = [];
    //las susceptibles a incidencia son las anteriores. Lo importante es el orden. La unica excepcion es si la pd está cerrada o en incidencia que esta es la anterior
    let pdsAnteriores = [];
    let promises = [];
    let promises2 = [];
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
            attributes: ["codigo", "nombre", "nombreCompleto"],
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
                //la incidencia se marca sobre la pd anterior (no la versión anterior)
                return models.sequelize.query(query = 'SELECT  * FROM public."ProgramacionDocentes" p   ORDER BY p."identificador" DESC ', 
                ).then(pdsBBDD => {
                    pdsBBDD[0].forEach(function (pdBBDD){
                        let existentePD = pds.find(function (obj) { return obj.PlanEstudioId === pdBBDD.PlanEstudioId });
                        if (!existentePD) {
                            pds.push({ PlanEstudioId: pdBBDD.PlanEstudioId, identificador:pdBBDD.identificador, estadoProGDoc: pdBBDD.estadoProGDoc, 
                                anoAcademico: pdBBDD.anoAcademico, siguienteAnoAcademico: siguienteAnoAcademico(pdBBDD.anoAcademico), semestre: pdBBDD.semestre, });
                            //TODO: cuando se añadan las otras funciones hay que ponerlas aquí
                            //para comprobar si la pd se puede marcar como lista para que el jefe de estudios la cierre
                            //aqui lo hago por si manualmente cambio algo de las otras partes para que al acceder a gestión cambie
                            if (pdBBDD['estadoProGDoc'] === estados.estadoProgDoc.abierto
                                && CumpleTodos(estados.estadoProfesor.aprobadoDirector, pdBBDD['estadoProfesores'])
                                && CumpleTodos(estados.estadoTribunal.aprobadoDirector, pdBBDD['estadoTribunales'])
                                && pdBBDD['estadoHorarios'] === estados.estadoHorario.aprobadoCoordinador
                                && prog['estadoExamenes'] === estados.estadoExamen.aprobadoCoordinador
                            ) {
                                promises2.push(models.ProgramacionDocente.update(
                                    { estadoProGDoc: estados.estadoProgDoc.listo }, /* set attributes' value */
                                    { where: { identificador: pdBBDD.identificador } } /* where criteria */
                                ).then(()=> {console.log("bbbb")}))
                            }
                            
                        }else{
                            let existentePDAnterior = pdsAnteriores.find(function (obj) { return obj.PlanEstudioId === pdBBDD.PlanEstudioId  });
                            //solo habrá una pd susceptible de incidencia como mucho y no debe coincidir con el mismo año o semestre, esto es por si hay varias versiones. Además si la pdActual está cerrada o incidencia ya será la pdActual la de incidencia
                            if (!existentePDAnterior && (pdBBDD.anoAcademico !== existentePD.anoAcademico || pdBBDD.semestre !== existentePD.semestre) && existentePD.estadoProgDoc !== estados.estadoProgDoc.cerrado && existentePD.estadoProgDoc !== estados.estadoProgDoc.incidencia) {
                                pdsAnteriores.push({
                                    PlanEstudioId: pdBBDD.PlanEstudioId, identificador: pdBBDD.identificador, estadoProGDoc: pdBBDD.estadoProGDoc,
                                    anoAcademico: pdBBDD.anoAcademico, semestre: pdBBDD.semestre,
                                });
                            }
                        }
                    })
                    // puede haber planes sin pd, como los nuevos planes u otras cosas
                    planes.forEach(function (plan) {
                        let existentePD = pds.find(function (obj) { return obj.PlanEstudioId === plan.codigo });
                        if(existentePD){
                            existentePD.nombre = plan.nombre;
                            existentePD.nombreCompleto = plan.nombreCompleto;
                        }
                        else{
                            pds.push({PlanEstudioId:plan.codigo, identificador: null, estadoProGDoc: estados.estadoProgDoc.cerrado, nombre: plan.nombre, nombreCompleto: plan.nombreCompleto, 
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
        console.log(promises2)
        return Promise.all(promises2).then(()=>{
            //si cambie alguna asignatura por el caso ese raro se deberá volver para obtener los datos.
            if(promises2.length > 0){
                res.redirect("" + req.baseUrl + "/AbrirCerrar")
            }else{
                res.render("abrirCerrarPds", {
                    planes: planes,
                    pds: pds,
                    permisoDenegado: res.locals.permisoDenegado,
                    pdsAnteriores: pdsAnteriores,
                    estadosProgDoc: estados.estadoProgDoc,
                    anos: anos,
                    consultarpath: "",
                    abrirpath: "" + req.baseUrl + "/abrirProgDoc",
                    cerrarpath: "" + req.baseUrl + "/cerrarProgDoc",
                    abririncidenciapath: "" + req.baseUrl + "/abrirIncidenciaProgDoc",
                    cerrarincidenciapath: "" + req.baseUrl + "/cerrarIncidenciaProgDoc",
                    submenu: req.session.submenu,
                    menu: req.session.menu,
                    planAcronimo: req.session.planAcronimo,
                })
            }

        })
    });
}

function siguienteAnoAcademico(anoActual) {
    let year = Number(anoActual.substr(0, 4));
    let siguiente = year + 1;
    let siguiente2 = year + 2;
    return ("" + siguiente + "" + siguiente2.toString().substr(-2));
}

//TODO: cuando se añadan las otras funciones hay que ponerlas aquí
//para comprobar si la pd se puede marcar como lista para que el jefe de estudios la cierre
exports.isPDLista = function(progID, thenFunction){
    return models.ProgramacionDocente.findOne(
        { 
            where: { identificador: progID },
            raw: true
     })
    .then(function (prog) {
        if (prog['estadoProGDoc'] === estados.estadoProgDoc.abierto
         &&CumpleTodos(estados.estadoProfesor.aprobadoDirector, prog['estadoProfesores'])
         && CumpleTodos(estados.estadoTribunal.aprobadoDirector, prog['estadoTribunales'])
         && prog['estadoHorarios'] === estados.estadoHorario.aprobadoCoordinador
         && prog['estadoExamenes'] === estados.estadoExamen.aprobadoCoordinador
            ){
            return models.ProgramacionDocente.update(
                { estadoProGDoc: estados.estadoProgDoc.listo }, /* set attributes' value */
                { where: { identificador: progID } } /* where criteria */
            ).then(()=>{
              thenFunction  
            })
            }else{
                thenFunction
            }        
    })
}
//se completa con lo que hay en el controller de abrirprogdoc_controller
//TODO a medida que aparezcan mas funciones hay que inicializar sus estados aquí
exports.abrirProgDoc = function (req, res, next) {
    let estadoProfesores = {};
    let estadoTribunales = {};
    let nuevaEntrada = {};
    if(!res.locals.permisoDenegado){
        res.locals.departamentosResponsables.forEach(function (element) {
            estadoProfesores[element] = estados.estadoProfesor.abierto;
            estadoTribunales[element] = estados.estadoProfesor.abierto;
        })
        nuevaEntrada.estadoProfesores = estadoProfesores;
        nuevaEntrada.fechaProfesores = new Date();
        nuevaEntrada.estadoTribunales = estadoTribunales;
        nuevaEntrada.fechaTribunales = new Date();
        nuevaEntrada.estadoHorarios = estados.estadoHorario.abierto;
        nuevaEntrada.fechaHorarios = new Date();
        nuevaEntrada.estadoProGDoc = estados.estadoProgDoc.abierto;
        nuevaEntrada.fechaGrupos = new Date();
        nuevaEntrada.estadoExamenes = estados.estadoExamen.abierto;
        nuevaEntrada.fechaExamenes = new Date();
        nuevaEntrada.estadoCalendario = estados.estadoCalendario.abierto;
        nuevaEntrada.fechaCalendario = new Date();
        
        return models.ProgramacionDocente.update(
            nuevaEntrada, /* set attributes' value */
            { where: { identificador: res.locals.identificador } } /* where criteria */
        ).then(() => {

            res.redirect("" + req.baseUrl + "/AbrirCerrar")
        })
    }else{
        res.redirect("" + req.baseUrl + "/AbrirCerrar")
    }

}

exports.cerrarProgDoc = function (req, res, next){
    if (!res.locals.permisoDenegado){
        let pdID = req.body.pdIdentificador.split("-")[1];
        models.ProgramacionDocente.findOne(
        { where: { identificador: pdID } } /* where criteria */
        ).then((pd) => {
            res.locals.progDoc = pd
            next()
        })
    }else{
        res.redirect("" + req.baseUrl + "/AbrirCerrar")
    }
    
}
//TODO a medida que aparezcan mas funciones hay que inicializar sus estados aquí
exports.abrirIncidenciaProgDoc = function (req, res, next) {
    if (!res.locals.permisoDenegado){
        let estadoProfesores = {};
        let estadoTribunales = {};
        let nuevaEntrada = {};
        res.locals.departamentosResponsables.forEach(function (element) {
            estadoProfesores[element] = estados.estadoProfesor.aprobadoDirector;
            estadoTribunales[element] = estados.estadoProfesor.aprobadoDirector;
        })
        nuevaEntrada.estadoProfesores = estadoProfesores;
        nuevaEntrada.estadoTribunales = estadoTribunales;
        nuevaEntrada.estadoHorarios = estados.estadoHorario.aprobadoCoordinador;
        nuevaEntrada.estadoExamenes = estados.estadoExamen.aprobadoCoordinador;
        nuevaEntrada.estadoProGDoc = estados.estadoProgDoc.incidencia;
        return models.ProgramacionDocente.update(
            nuevaEntrada, /* set attributes' value */
            { where: { identificador: res.locals.identificador } } /* where criteria */
        ).then(() => {

            res.redirect("" + req.baseUrl + "/AbrirCerrar")
        })
    }else{
        res.redirect("" + req.baseUrl + "/AbrirCerrar")
    }
    
}
exports.cerrarIncidenciaProgDoc = function (req, res, next) {
    if (!res.locals.permisoDenegado) {
        let pdID = req.body.pdIdentificador.split("-")[1];
        models.ProgramacionDocente.findOne(
            { where: { identificador: pdID } } /* where criteria */
        ).then((pd) => {
            res.locals.progDoc = pd
            next()
        })
    } else {
        res.redirect("" + req.baseUrl + "/AbrirCerrar")
    }
   
}
//TODO en el futuro la url será la del servidor donde lo almacene
exports.cerrarProgDoc2 = function (req, res, next) {
    let pdID = res.locals.progDoc['identificador']
        models.ProgramacionDocente.update(
            { estadoProGDoc: estados.estadoProgDoc.cerrado,
              HistorialID : "url_"+pdID }, /* set attributes' value */
            { where: { identificador: pdID } } /* where criteria */
        ).then(() => {
            res.redirect("" + req.baseUrl + "/AbrirCerrar")
        })


}

function CumpleTodos(estado,objeto){
    for (variable in objeto) {
        if (objeto[variable] !== estado) {
            return false;
        }
    }
    return true;
}