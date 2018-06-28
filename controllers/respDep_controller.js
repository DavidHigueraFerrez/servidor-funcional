let app = require('../app')
let models = require('../models');
let Sequelize = require('sequelize');
const nodemailer = require('nodemailer');
let mail = require('../mail/mail');
const op = Sequelize.Op;



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
                    estadoProGDoc: {
                        [op.gt]: 0,
                        [op.lt]: 6
                    }

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

// GET /respDoc/:pdID/:departamentoID
exports.get = function (req, res, next) {


    req.session.submenu = "Profesores"
    if (!res.locals.progDoc){
        res.send("Programacíón docente no abierta.")
    }
    if (res.locals.progDoc['ProgramacionDocentes.estadoProfesores'] !== 0 && res.locals.progDoc['ProgramacionDocentes.estadoProfesores'] !== 1 ){
        res.send("Programacíón docente no abierta.")
    }
    req.session.asignacion = [];
    let pdID = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.identificador']
    let departamentoID = req.query.departamentoID
    if (req.session.profesores) {
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
                let correo = profesor['email']
                let prof = { nombre: nombre, correo: correo }
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
                DepartamentoResponsable: DepartamentoResponsable
            },
            attributes: ['acronimo', 'curso', 'CoordinadorAsignatura', 'identificador'],
            order: [

                [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
                [Sequelize.literal('"AsignacionProfesors.Grupo.nombre"'), 'ASC']
            ],
            raw: true,
            include: [{
                //left join 
                model: models.AsignacionProfesor,

                attributes: ['ProfesorId', 'GrupoId', 'identificador'],
                include: [{
                    model: models.Grupo,
                    attributes: ['nombre']
                }]
            }]
        })
            .each(function (ej) {
                let elementPos = req.session.asignacion.map(function (x) { return x.acronimo; }).indexOf(ej.acronimo);
                let asign = req.session.asignacion.find(function (obj) { return obj.acronimo === ej['acronimo']; });
                if (!asign) {
                    asign = {}
                    let obj = req.session.profesores.find(function (obj) { return obj.correo === ej['CoordinadorAsignatura']; });
                    //console.log(req.session.profesores)
                    if (!obj) {
                        obj = "No hay coordinador"
                    }
                    asign.acronimo = ej.acronimo;
                    asign.identificador = ej.identificador
                    asign.curso = ej.curso;
                    asign.coordinador = obj
                    asign.grupos = [];
                    let grupo = {};
                    grupo.GrupoId = ej["AsignacionProfesors.GrupoId"]
                    grupo.GrupoNombre = ej["AsignacionProfesors.Grupo.nombre"]
                    grupo.profesors = []
                    let profi = req.session.profesores.find(function (obj) { return obj.correo === ej["AsignacionProfesors.ProfesorId"]; });
                    if (profi) {
                        let p = {};
                        p.correo = profi.correo;
                        p.nombre = profi.nombre;
                        p.asignacion = ej["AsignacionProfesors.identificador"]
                        grupo.profesors.push(p)
                    }
                    asign.grupos.push(grupo);
                    req.session.asignacion.push(asign);

                }
                else {
                    let grupoPos = asign['grupos'].map(function (x) { return x.GrupoId; }).indexOf(ej["AsignacionProfesors.GrupoId"]);
                    let grupo = asign['grupos'].find(function (obj) { return obj.GrupoId === ej["AsignacionProfesors.GrupoId"]; });
                    if (!grupo) {
                        grupo = {};
                        grupo.GrupoId = ej["AsignacionProfesors.GrupoId"]
                        grupo.GrupoNombre = ej["AsignacionProfesors.Grupo.nombre"]
                        grupo.profesors = []
                        let profi = req.session.profesores.find(function (obj) { return obj.correo === ej["AsignacionProfesors.ProfesorId"]; });
                        //console.log(ej)
                        //console.log(profi)
                        if (profi) {
                            let p = {};
                            p.correo = profi.correo;
                            p.nombre = profi.nombre;
                            p.asignacion = ej["AsignacionProfesors.identificador"]
                            grupo.profesors.push(p)
                            
                        }
                        req.session.asignacion[elementPos]["grupos"].push(grupo)


                    } else {
                        let profi = req.session.profesores.find(function (obj) { return obj.correo === ej["AsignacionProfesors.ProfesorId"]; });
                        if (profi) {
                            let p = {};
                            p.correo = profi.correo;
                            p.nombre = profi.nombre;
                            p.asignacion = ej["AsignacionProfesors.identificador"]
                            req.session.asignacion[elementPos]["grupos"][grupoPos]['profesors'].push(p)
                        }
                    }

                }

            })
            .then(function (e) {
                //console.log(req.originalUrl)
                //console.log(req.baseUrl)
                //console.log(req.path)
                    let nuevopath = "" + req.baseUrl + "/respdoc/editAsignacion"
                res.render('asignaciones',
                    {
                        profesores: req.session.profesores,
                        asignacion: req.session.asignacion,
                        nuevopath: nuevopath,
                        aprobarpath: "" + req.baseUrl + "/respDoc/aprobarAsignacion",
                        planAcronimo : req.session.planAcronimo,
                        estadoProfesores: res.locals.progDoc['ProgramacionDocentes.estadoProfesores'],
                        pdID: pdID,
                        menu: req.session.menu,
                        submenu: req.session.submenu,
                        departamentoID: req.query.departamentoID
                    }) 
                
               
            })
    }
}

// GET respDoc/editAsignacion:pdID/:departamentoID/:acronimo
exports.edit = function (req, res, next) {
    req.session.submenu = "Profesores"
    let pdID = req.query.pdID
    let departamentoID = req.query.departamentoID
    let acronimo = req.query.acronimo
    let asign = req.session.asignacion.find(function (obj) { return obj.acronimo === acronimo; });
    
    res.render('asignacionesCumplimentar',
                {asign:asign,
                 pdID: pdID,
                 cancelarpath: "" + req.baseUrl + "/respDoc/?planAcronimo="+req.session.planAcronimo+"&departamentoID="+departamentoID,   
                 nuevopath : "" + req.baseUrl + "/respDoc/guardarAsignacion",
                 planAcronimo: req.session.planAcronimo,
                 menu: req.session.menu,
                 submenu: req.session.submenu,
                 profesores: req.session.profesores})

}
    
//POST respDoc/guardarAsignacion
exports.guardarAsignacion = function (req, res, next){
        req.session.submenu = "Profesores"
        let whereEliminar={};
        let coordinador = req.session.profesores.find(function (obj) { return obj.nombre === req.body.coordinador; });
        let identificador = Number(req.body.asignaturaId)
        let pdID = Number(req.body.pdID)
        let planAcronimo = req.session.planAcronimo
        if(coordinador){
            models.Asignatura.update(
                { CoordinadorAsignatura: coordinador.correo }, /* set attributes' value */
                { where: { identificador: identificador } } /* where criteria */
            ).then(() => {
                paso2();
            })
        }else{
            paso2();
        }
        function paso2(){
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
                        let grupo = Number(toAnadir.split("_")[2])
                        let profesor = toAnadir.split("_")[3]
                        let nuevaEntrada = {};
                        nuevaEntrada.AsignaturaId = identificador;
                        nuevaEntrada.ProfesorId = profesor;
                        nuevaEntrada.GrupoId = grupo;
                        queryToAnadir.push(nuevaEntrada);
                    } else {
                        toAnadir.forEach(function (element, index) {
                            let grupo = Number(element.split("_")[2])
                            let profesor = element.split("_")[3]
                            let nuevaEntrada = {};
                            nuevaEntrada.AsignaturaId = identificador;
                            nuevaEntrada.GrupoId = grupo;
                            nuevaEntrada.ProfesorId = profesor;
                            queryToAnadir.push(nuevaEntrada);
                        });
                    }
                }
                return models.AsignacionProfesor.bulkCreate(
                    queryToAnadir
                ).then(() => { // Notice: There are no arguments here, as of right now you'll have to...
                    res.redirect("" + req.baseUrl + "/respDoc/?pdID="+pdID+"&departamentoID=D520&planAcronimo="+planAcronimo)
                })

            }        
        }
           
}
// GET respDoc/aprobarAsignacion:pdID
exports.aprobarAsignacion = function(req,res,next){
    let pdID = req.query.pdID;
    let date = new Date();
    let planAcronimo = req.session.planAcronimo;
    let estadoProf = Number (req.query.estadoProfesores)
    if(estadoProf === 1){
        let decision = req.query.decision
        if (decision !== 'aceptar')
            estadoProf = -1;
        }

    models.ProgramacionDocente.update(
        { estadoProfesores: estadoProf+1,
          fechaProfesores: date  }, /* set attributes' value */
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
        });*/
        res.redirect(""+req.baseUrl + "/Cumplimentar")        
    })
}

// GET respDoc/tribunales:pdID/:departamentoID
exports.getTribunales = function (req, res, next){
    let planAcronimo = req.session.planAcronimo
    if (!res.locals.progDoc) {
        res.send("Programacíón docente no abierta.")
    }
    let pdID = req.query.pdID ? req.query.pdID : res.locals.progDoc['ProgramacionDocentes.identificador']
    let departamentoID = req.query.departamentoID
    if (req.session.profesores) {
        getMiembrosTribunal(pdID, departamentoID);

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
                let correo = profesor['email']
                let prof = { nombre: nombre, correo: correo }
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
            attributes: ['acronimo', 'curso', 'identificador'],
            order: [

                [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
                [Sequelize.literal('"Asignatura"."acronimo"'), 'ASC']
            ],
            raw: true,
            include: [{
                //left join 
                model: models.TribunalAsignatura,
            }]
        })
            .each(function (ej) {
                let presidente = req.session.profesores.find(function (obj) {return obj.correo === ej['TribunalAsignatura.PresidenteTribunalAsignatura'];});
                if (presidente){
                    ej.presidenteNombre = presidente.nombre
                }
                let vocal = req.session.profesores.find(function (obj) { return obj.correo === ej['TribunalAsignatura.VocalTribunalAsignatura']; });
                if (vocal) {
                    ej.vocalNombre = vocal.nombre
                }
                let secretario = req.session.profesores.find(function (obj) { return obj.correo === ej['TribunalAsignatura.SecretarioTribunalAsignatura']; });
                if (secretario) {
                    ej.secretarioNombre = secretario.nombre
                }
                ej.tribunalId = ej['TribunalAsignatura.identificador'];
                

            })
            .then(function (e) {
                //console.log(req.originalUrl)
                //console.log(req.baseUrl)
                //console.log(req.path)
                let nuevopath = "" + req.baseUrl + "/respdoc/guardarTribunales"
                let cancelarpath = "" + req.baseUrl + "/respdoc/tribunales?planAcronimo="+req.session.planAcronimo+"&departamentoID="+departamentoID
                res.render('tribunales',
                    {
                        profesores: req.session.profesores,
                        tribunales: e,
                        submenu: req.session.submenu,
                        menu: req.session.menu,
                        nuevopath: nuevopath,
                        cancelarpath: cancelarpath,
                        planAcronimo: req.session.planAcronimo,
                        pdID: pdID,
                        departamentoID: req.query.departamentoID
                    })
            })
    }
}

//POST respDoc/guardarTribunales
exports.guardarTribunales = function (req, res, next) {
    let planAcronimo = req.session.planAcronimo
    let toActualizar = req.body.actualizar;
    req.session.submenu = "Tribunales"
    if (toActualizar) {
        if (!Array.isArray(toActualizar)) {
            let tribunalId = Number(toActualizar.split("_")[0])
            let profesorCorreo = toActualizar.split("_")[1]
            let puestoTribunal = toActualizar.split("_")[2]+"TribunalAsignatura"
            let nuevaEntrada = {};
            nuevaEntrada[puestoTribunal] = profesorCorreo;
            models.TribunalAsignatura.update(
                nuevaEntrada, /* set attributes' value */
                { where: { identificador: tribunalId } } /* where criteria */
            ).then(() => {
                res.redirect("" + req.baseUrl + "/respDoc/tribunales?departamentoID=D520&planAcronimo=" + planAcronimo)
            })
        } else {
            let promises = [];
            let tribunalesToActualizar = [];
            toActualizar.forEach(function (element, index) {
                let tribunalToActualizar;
                let tribunalId = Number(element.split("_")[0])
                let profesorCorreo = element.split("_")[1]
                let puestoTribunal = element.split("_")[2]+"TribunalAsignatura"
                tribunalToActualizar = tribunalesToActualizar.find(function (obj) { return obj.identificador === tribunalId ; });
                    if (tribunalToActualizar){
                        tribunalToActualizar.puestos[puestoTribunal]= profesorCorreo;
                    }
                    else{
                        tribunalToActualizar = {}
                        tribunalToActualizar.identificador = tribunalId;
                        tribunalToActualizar.puestos= {}
                        tribunalToActualizar.puestos[puestoTribunal] = profesorCorreo
                        tribunalesToActualizar.push(tribunalToActualizar)
                    }
    
            });
            tribunalesToActualizar.forEach(function (element,index){
                promises.push(models.TribunalAsignatura.update(
                    tribunalesToActualizar[index].puestos,
                    { where: { identificador: tribunalesToActualizar[index].identificador } } 
                ))

            })
            
            return Promise.all(promises).then(() => {
                res.redirect("" + req.baseUrl + "/respDoc/tribunales?departamentoID=D520&planAcronimo=" + planAcronimo)
            });
            
        }
    }else{
        res.redirect("" + req.baseUrl + "/respDoc/tribunales?departamentoID=D520&planAcronimo=" + planAcronimo)
    }
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
    
