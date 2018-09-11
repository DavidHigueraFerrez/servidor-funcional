let models = require('../models');
let Sequelize = require('sequelize');


exports.comprobarRols = function(req,res,next){
    let rols = req.session.user.rols
    let rolsCoincidentes = [];
    let pdID = req.session.pdID;
    return models.ProgramacionDocente.findOne({ where: { identificador: pdID } }).then(pd => {
        res.locals.rols.forEach(function (r, index) {
            let rolExistente = rols.find(function (obj) { return (obj.rol === r.rol && obj.PlanEstudioCodigo === r.PlanEstudioCodigo && obj.DepartamentoCodigo === r.DepartamentoCodigo) });
            console.log(rolExistente)
            if (rolExistente) {
                let cumple = true;
                if (Array.isArray(r.condiciones)){
                    for (let i = 0; i < r.condiciones.length; i++) {
                        let condic = r.condiciones[i].condicion.trim().split('[')
                        switch (condic.length){
                            case 1:
                                console.log(pd[condic[0]])
                                if (pd[condic[0]] !== r.condiciones[i].resultado){
                                    cumple = false;
                                }
                                break;
                            case 2:
                                console.log(pd[condic[0]][condic[1]])
                                if (pd[condic[0][condic[1]]] === r.condiciones[i].resultado) {
                                    cumple = false;
                                }
                                break;
                        }
                    }
                }
                console.log(cumple)
                //si cumple las condiciones o no hay condiciones
                if (cumple) {
                    rolsCoincidentes.push(rolExistente);
                }
            }
        })
        if (rolsCoincidentes.length === 0) {
            res.locals.permisoDenegado = "No tiene permiso"
        }
        res.locals.rolsCoincidentes = rolsCoincidentes
        next();
    })


}

//comprobamos que solo pueden acceder profesores 
exports.comprobarRolYPersona = function(req,res,next){
    let role = req.session.user.employeetype;
    let mail = req.session.user.mail;
    if(mail==='david.higuera.ferrez@alumnos.upm.es'||mail==='javier.conde.diaz@alumnos.upm.es'){
        next();
    }else{
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


//eliminar el contexto para el boton de back
exports.noreturnLogout = function (req,res,next){
    
    next();
};
