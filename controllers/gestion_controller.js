let app = require('../app')
let models = require('../models');
let funciones = require('../funciones');
let Sequelize = require('sequelize');

//funcion de getRoles para directores de departamentos jefe de estudios y subdirector de posgrado
exports.getRoles = function (req, res, next) {
    req.session.submenu = "Roles"
    req.session.responsablesDocentes = [];
    req.session.profesores = [];
    let profesores = req.session.profesores;
    //responsables docentes
    models.Rol.findAll({
        attributes: ['rol', 'PlanEstudioCodigo', 'PersonaEmail', 'DepartamentoCodigo'],
        include: [{
            model: models.Persona,
            attributes: ['nombre','apellido'],
            required: true,
            nested:true
        }],
        raw: true  
    })
        .each(function (persona, roles) {
            let rol = roles['rol'];
            let PersonaEmail = roles['PersonaEmail'];
            let planEstudioCodigo = roles['PlanEstudioCodigo'];
            let DepartamentoCodigo = roles['DepartamentoCodigo'];
            let cargos = { rol: rol, planEstudioCodigo: planEstudioCodigo, PersonaEmail:  PersonaEmail, DepartamentoCodigo: DepartamentoCodigo }
            req.session.responsablesDocentes.push(cargos);

        })
        .then(function (cargos) {
            //aqui llamar a la funcion de sacar los nombres de cada correo
            getNombresResponsables(cargos);
        
        })
        .catch(function (error) {
            console.log("Error:", error);
            next(error);
    });
    

//funcion para sacar los nombres de los responsable de los roles
function  getNombresResponsables(cargos){

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

        })
        .then(function (prof) {
            //de esta manera puedes sacar los string al anidar los includes de las tablas
            console.log(cargos[0].rol);
            console.log(cargos[0].PersonaEmail);
            console.log(profesores[0].correo);
            console.log(profesores[0].nombre);
            console.log('a continuacion nombres de cargos');
            

            res.render('gestionRoles',{
                roles : cargos,
                profesores: profesores,
                submenu: req.session.submenu,
                menu: req.session.menu
            });
        })
        .catch(function (error) {
            console.log("Error:", error);
        });
    }
}

//query para guardar los cambios del sistema
exports.guardarRoles = function(req,res,next){
    req.session.submenu = "Roles"
    let planAcronimo = req.session.planAcronimo;
    let departamentoID = req.session.departamentoID;
    let pdID = req.body.pdID;
    let toActualizar = req.body.actualizar;      
        if (toActualizar && !res.locals.permisoDenegado) {
            if (!Array.isArray(toActualizar)) {
                let tribunalId = Number(toActualizar.split("_")[0])
                let profesorCorreo = toActualizar.split("_")[1]
                let puestoTribunal = toActualizar.split("_")[2] + "TribunalAsignatura"
                let nuevaEntrada = {};
                nuevaEntrada[puestoTribunal] = profesorCorreo;
                return models.Asignatura.update(
                    nuevaEntrada, /* set attributes' value */
                    { where: { identificador: tribunalId } } /* where criteria */
                ).then(() => {
                    next();
                })
            } else {
                let promises = [];
                let tribunalesToActualizar = [];
                toActualizar.forEach(function (element, index) {
                    let tribunalToActualizar;
                    let tribunalId = Number(element.split("_")[0])
                    let profesorCorreo = element.split("_")[1]
                    let puestoTribunal = element.split("_")[2] + "TribunalAsignatura"
                    tribunalToActualizar = tribunalesToActualizar.find(function (obj) { return obj.identificador === tribunalId; });
                    if (tribunalToActualizar) {
                        tribunalToActualizar.puestos[puestoTribunal] = profesorCorreo;
                    }
                    else {
                        tribunalToActualizar = {}
                        tribunalToActualizar.identificador = tribunalId;
                        tribunalToActualizar.puestos = {}
                        tribunalToActualizar.puestos[puestoTribunal] = profesorCorreo
                        tribunalesToActualizar.push(tribunalToActualizar)
                    }

                });
                tribunalesToActualizar.forEach(function (element, index) {
                    promises.push(models.Asignatura.update(
                        tribunalesToActualizar[index].puestos,
                        { where: { identificador: tribunalesToActualizar[index].identificador } }
                    ))

                })

                return Promise.all(promises).then(() => {
                    next()
                });

            }
        } else {
            next()
        }
}

exports.getResponsablesDocentes = function(req,res,next){

}

