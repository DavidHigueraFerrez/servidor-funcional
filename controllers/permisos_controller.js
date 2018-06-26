let models = require('../models');
let Sequelize = require('sequelize');

//Ruta de desarrollo para que solo podamos acceder a las principales los desarrolladores y G.huecas
exports.comprobarAdmins = function(req,res,next){
    let role = req.session.user.employeetype;
    let mail = req.session.user.mail;
    console.log(role);
    if(mail==='david.higuera.ferrez@alumnos.upm.es'||mail==='javier.conde.diaz@alumnos.upm.es'
    ||mail==='gabriel.huecas@upm.es'){
        if(! req.session.roles)
            req.session.roles = {};
        req.session.roles['admin']= true
        next();
    }else{
    }
};

//comprobamos que solo pueden acceder profesores 
exports.comprobarRolYPersona = function(req,res,next){
    let role = req.session.user.employeetype;
    let mail = req.session.user.mail;
    console.log(role);
    if(mail==='david.higuera.ferrez@alumnos.upm.es'||mail==='javier.conde.diaz@alumnos.upm.es'){
        next();
    }else if(role!=='D'){
        console.log('no tiene acceso permitido porque no eres profesor');
        res.render('noPermitido', {layout:false});
    } else{
        //comprobamos en la tabla de persona si esta o no esta
        models.Persona.findById(mail).then(persona => {
            if (persona) {
                console.log('si tiene acceso permitido');
                next();
            }
            if (!persona) {
                console.log(persona);
                console.log('no tiene acceso permitido');
                res.render('noPermitido', {layout:false});
            }
        })
    }
};

//comprobacion de si estas en  la tabla de personas
exports.comprobarPersona = function (req, res, next) {
    //sacamos el mail del usuario que se ha logeado con CAS

    let role = req.session.user.employeetype;
    let mail = req.session.user.mail;
    console.log(role);
    //comprobamos en la tabla de persona si esta o no esta
    if (mail === 'david.higuera.ferrez@alumnos.upm.es' || mail === 'javier.conde.diaz@alumnos.upm.es') {
        next();
    }
    models.Persona.findById(mail).then(persona => {
        if (persona) {
            console.log('si tiene acceso permitido');
            next();
        }
        if (!persona) {
            console.log(persona);
            console.log('no tiene acceso permitido');
            res.render('noPermitido', {layout:false});
        }
    })
};  

//comprobacion de si estas en  la tabla de coordinadores
exports.comprobarCoordinador = function (req, res, next) {
    //sacamos el mail de la persona que se ha logeado
    
    let role = req.session.user.employeetype;
    let mail = req.session.user.mail;
    //añadir comprobación plan estudios.

    //comprueba si esta en la lista de coordinadores 
    models.PlanEstudio.findOne({ where: { CoordinadorTitulacionPlanEstudio: mail } }).then( function(persona) {
        console.log(persona);
        if (persona) {
            console.log('si tiene acceso permitido');
            next();
        }
        if (!persona) {
            console.log(persona);
            console.log('no tiene acceso permitido');
            res.render('noPermitido', { layout: false });
        }
    })
};

//comprobacion de si eres Responsable Departamento
exports.comprobarResponsableDocente = function (req, res, next) {
    //sacamos el mail de la persona que se ha logead
    let role = req.session.user.employeetype;
    let mail = req.session.user.mail;
    let departamento = req.query.departamento
    //comprobamos si esa persona esta en la lista de responsables docentes 
    models.Rol.find({ where: { ResponsableDocente: mail, Departamento: departamento } }).then(persona => {
        if (persona) {
            console.log('si tiene acceso permitido');
            req.session.roles['responsableDocente'][departamento] = true
            next();
        }
        if (!persona) {
            console.log(persona);
            console.log('no tiene acceso permitido');
            next();
        }
    })
};

exports.comprobarDirectorDepartamento = function (req, res, next) {
    //sacamos el mail de la persona que se ha logead
    let role = req.session.user.employeetype;
    let mail = req.session.user.mail;
    let departamento = req.query.departamento
    //comprobamos si esa persona esta en la lista de responsables docentes 
    models.Rol.find({ where: { DirectorDepartamento: mail, Departamento: departamento } }).then(persona => {
        if (persona) {
            console.log('si tiene acceso permitido');
            req.session.roles['directorDepartamento'][departamento] = true
            next();
        }
        if (!persona) {
            console.log('no tiene acceso permitido');
            next();
        }
    })
};

//comprobacion de si eres Subdirector de Posgrado
exports.comprobarSubdirectorPosgrado = function (req, res, next) {
    //scamos el mail de la persona que se ha logeado
    let role = req.session.user.employeetype;
    let mail = req.session.user.mail;
    //comprobamos que la persona esta en la lista como subdirector de posgrado
    models.PlanEstudio.find({ where: { SubdirectorPosgradoPlanEstudio: mail } }).then(persona => {
        if (persona) {
            console.log('si tiene acceso permitido');
            next();
        }
        if (!persona) {
            console.log(persona);
            console.log('no tiene acceso permitido');
            res.render('noPermitido', { layout: false });
        }
    })
};

exports.comprobarJefeEstudios = function (req, res, next) {
    //scamos el mail de la persona que se ha logeado
    let role = req.session.user.employeetype;
    let mail = req.session.user.mail;
    if (mail === 'david.higuera.ferrez@alumnos.upm.es' || mail === 'javier.conde.diaz@alumnos.upm.es') {
        next();
    }
    //comprobamos que la persona esta en la lista como subdirector de posgrado
    models.PlanEstudio.find({ where: { JefeEstudioPlanEstudio: mail } }).then(persona => {
        if (persona) {
            console.log('si tiene acceso permitido');
           next();
        }
        if (!persona) {
            console.log(persona);
            console.log('no tiene acceso permitido');
            res.render('noPermitido', { layout: false });
        }
    })
};

//comprobacion SecretariaPlanDeEstudios
exports.comprobarSecretariaJefeEstudios = function (req, res, next) {
    //scamos el mail de la persona que se ha logeado
    let role = req.session.user.employeetype;
    let mail = req.session.user.mail;
    if (mail === 'david.higuera.ferrez@alumnos.upm.es' || mail === 'javier.conde.diaz@alumnos.upm.es') {
        next();
    }
    //comprobamos que la persona esta en la lista como secretaria del JefeDe Estudios
    models.PlanEstudio.find({ where: { SecretariaPlanEstudios: mail } }).then(persona => {
        if (persona) {
            console.log('si tiene acceso permitido');
            next();
            //res.render('directorPosgrado');
        }
        if (!persona) {
            console.log(persona);
            console.log('no tiene acceso permitido');
            res.render('noPermitido', { layout: false });
        }
    })
};

//comprobacion de si eres DirectorDeDepartamento
exports.comprobarDirectorDepartamento = function (req, res, next) {
    //scamos el mail de la persona que se ha logeado
    let role = req.session.user.employeetype;
    let mail = req.session.user.mail;
    //comprobamos que la persona esta en la lista como subdirector de posgrado
    models.DireccionDepartamento.find({ where: { DirectorDepartamento: mail } }).then(persona => {
        if (persona) {
            console.log('si tiene acceso permitido');
            next();
        }
        if (!persona) {
            console.log(persona);
            console.log('no tiene acceso permitido');
            res.render('noPermitido', { layout: false });
        }
    })
};

//comprobacion de si eres DirectorDeDepartamento
exports.comprobarJefeEstudiosOSecretaria = function (req, res, next) {
    let role = req.session.user.employeetype;
    let mail = req.session.user.mail;
    if (mail === 'david.higuera.ferrez@alumnos.upm.es' || mail === 'javier.conde.diaz@alumnos.upm.es') {
        next();
    }
    //comprobamos que la persona esta en la lista como subdirector de posgrado
    models.PlanEstudio.find({ where: { JefeEstudioPlanEstudio: mail } }).then(persona => {
        if (persona) {
            console.log('si tiene acceso permitido');
            next();
        }
        if (!persona) {
            models.PlanEstudio.find({ where: { SecretarioPlanEstudio: mail } }).then(persona2 => {
                if (persona2) {
                    next()
                    
                    //res.render('directorPosgrado');
                }
                if (!persona2) {
                    console.log(persona2);
                    console.log('no tiene acceso permitido');
                    res.render('noPermitido', { layout: false });
                }
            })
        }
    })
};

//comprobacion de si eres ResponsableDoc o DirectDept o Coord o SubPosg o JefeEstudios
exports.comprobarResponsableDocenteODirectorOCoordinadorOSubDirectorPosgradoOJefeEstudios= function (req, res, next) {
    let role = req.session.user.employeetype;
    let mail = req.session.user.mail;
    //comprobamos que la persona esta en la lista como subdirector de posgrado
    models.DireccionDepartamento.find({ where: { ResponsableDocenteDepartamento: mail } }).then(persona => {
        if (persona) {
            console.log('si tiene acceso permitido');
            next();
        }
        if (!persona) {
            models.DireccionDepartamento.find({ where: { DirectorDepartamento: mail } }).then(persona2 => {
                if (persona2) {
                    next();
                    //res.render('directorPosgrado');
                }
                if (!persona2) {
                    models.PlanEstudio.findOne({ where: { CoordinadorTitulacionPlanEstudio: mail } }).then(persona3 => {
                        if (persona3) {
                            next();
                            //res.render('directorPosgrado');
                        }
                        if (!persona3) {
                            models.PlanEstudio.find({ where: { SubdirectorPosgradoPlanEstudio: mail } }).then(persona4 => {
                                if (persona4) {
                                    next();
                                    //res.render('directorPosgrado');
                                }
                                if (!persona4) {
                                    models.PlanEstudio.find({ where: { JefeEstudioPlanEstudio: mail } }).then(persona5 => {
                                        if (persona5) {
                                            console.log('si tiene acceso permitido');
                                            next();
                                        }
                                        if (!persona5) {
                                            console.log(persona);
                                            console.log('no tiene acceso permitido');
                                            res.render('noPermitido', { layout: false });
                                        }
                                    })
                                }
                            })
                        }
                    })
                }
            })
        }
    })
};

//comprobacion de si eres DirectDept o Coord o SubPosg o JefeEstudios
exports.comprobarDirectorOCoordinadorOSubDirectorPosgradoOJefeEstudios= function (req, res, next) {
    let role = req.session.user.employeetype;
    let mail = req.session.user.mail;
    //comprobamos que la persona esta en la lista como subdirector de posgrado
    models.DireccionDepartamento.find({ where: { DirectorDepartamento: mail } }).then(persona2 => {
        if (persona2) {
            next();
                    //res.render('directorPosgrado');
        }
        if (!persona2) {
            models.PlanEstudio.findOne({ where: { CoordinadorTitulacionPlanEstudio: mail } }).then(persona3 => {
                if (persona3) {
                    next();
                            //res.render('directorPosgrado');
                }
                if (!persona3) {
                    models.PlanEstudio.find({ where: { SubdirectorPosgradoPlanEstudio: mail } }).then(persona4 => {
                        if (persona4) {
                            next();
                                    //res.render('directorPosgrado');
                        }
                        if (!persona4) {
                            models.PlanEstudio.find({ where: { JefeEstudioPlanEstudio: mail } }).then(persona5 => {
                                if (persona5) {
                                    console.log('si tiene acceso permitido');
                                    next();
                                }
                                if (!persona5) {
                                    console.log(persona5);
                                    console.log('no tiene acceso permitido');
                                    res.render('noPermitido', { layout: false });
                                }
                            })
                        }
                    })
                }
            })
        }
    })
};

//comprobacion de si eres Coord o SubPosg o JefeEstudios
exports.comprobarCoordinadorOSubDirectorPosgradoOJefeEstudios= function (req, res, next) {
    let role = req.session.user.employeetype;
    let mail = req.session.user.mail;
    //comprobamos que la persona esta en la lista como subdirector de posgrado
    models.PlanEstudio.findOne({ where: { CoordinadorTitulacionPlanEstudio: mail } }).then(persona3 => {
        if (persona3) {
            next();
                            //res.render('directorPosgrado');
        }
        if (!persona3) {
            models.PlanEstudio.find({ where: { SubdirectorPosgradoPlanEstudio: mail } }).then(persona4 => {
                if (persona4) {
                    next();
                                    //res.render('directorPosgrado');
                }
                if (!persona4) {
                    models.PlanEstudio.find({ where: { JefeEstudioPlanEstudio: mail } }).then(persona5 => {
                        if (persona5) {
                            console.log('si tiene acceso permitido');
                            next();
                        }
                        if (!persona5) {
                            console.log(persona5);
                            console.log('no tiene acceso permitido');
                            res.render('noPermitido', { layout: false });
                        }
                    })
                }
            })
        }
    })
};

//comprobacion de si eres SubPosg o JefeEstudios
exports.comprobarSubDirectorPosgradoOJefeEstudios= function (req, res, next) {
    let role = req.session.user.employeetype;
    let mail = req.session.user.mail;
    //comprobamos que la persona esta en la lista como subdirector de posgrado
    models.PlanEstudio.find({ where: { SubdirectorPosgradoPlanEstudio: mail } }).then(persona4 => {
        if (persona4) {
            next();
        }
        if (!persona4) {
            models.PlanEstudio.find({ where: { JefeEstudioPlanEstudio: mail } }).then(persona5 => {
                if (persona5) {
                    console.log('si tiene acceso permitido');
                    next();
                }
                if (!persona5) {
                    console.log(persona5);
                    console.log('no tiene acceso permitido');
                    res.render('noPermitido', { layout: false });
                }
            })
        }
    })
};

//eliminar el contexto para el boton de back
exports.noreturnLogout = function (req,res,next){
    
    next();
};