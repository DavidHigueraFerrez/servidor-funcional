let app = require('../app')
let path = require('path')
let models = require('../models');
let Sequelize = require('sequelize');
const nodemailer = require('nodemailer');
const op = Sequelize.Op;
let estados = require('../estados');
let mail = require('../mail/mail');
let enumsPD = require('../enumsPD');
let funciones = require('../funciones');
let pdf = require('html-pdf');
let fs = require('fs');
let ejs = require('ejs')
//local
const base = path.resolve('public'); //  just relative path to absolute path 
//despliegue¿?
let configPdfDraft = {
    "format": "A4",        // allowed units: A3, A4, A5, Legal, Letter, Tabloid
    "base": `file://${base}/`,// you have to set 'file://' Ahí puedo ya referenciar a todos por ejemplo una imagen images/imagen.png, o un css
    "orientation": "portrait", // portrait or landscape
      paginationOffset: 1,       // Override the initial pagination number
    "header": {
        "height": "35mm",
        "contents": '<img src="https://www.portalparados.es/wp-content/uploads/universidad-politecnica-madrid.jpg" alt="Politécnica" style="width:30mm;height:20mm;">'+'<div class="draft"><p class="draftText">Draft</div >'
    },
    "footer": {
        "height": "10mm",
        "contents": {
            first: ' ',
            default: '<span style="color: #444; font-size: 8pt;">{{page}}/{{pages}}</span>', // fallback value
        }
    },
}
let configPdfCerrado =  {
    "format": "A4",        // allowed units: A3, A4, A5, Legal, Letter, Tabloid
    "base": `file://${base}/`,// you have to set 'file://' Ahí puedo ya referenciar a todos por ejemplo una imagen images/imagen.png, o un css
    "orientation": "portrait", // portrait or landscape
    paginationOffset: 1,       // Override the initial pagination number
    "header": {
        "height": "35mm",
        "contents": '<img src="https://www.portalparados.es/wp-content/uploads/universidad-politecnica-madrid.jpg" alt="Politécnica" style="width:30mm;height:20mm;">'
    },
    "footer": {
        "height": "10mm",
        "contents": {
            first: ' ',
            default: '<span style="color: #444; font-size: 8pt;">{{page}}/{{pages}}</span>', // fallback value
        }
    },
}

exports.generarPDF = function (req, res, next) {
    let view = req.originalUrl.toLowerCase().includes("consultar") ? "pdfDraftGenerado" : "pdfCerrado"
    if (view === "pdfDraftGenerado"){
        req.session.submenu = "PDF"
    }
    //si no hay progDoc o no hay departamentosResponsables de dicha progDoc
    if (view === "pdfDraftGenerado" && (!res.locals.progDoc || !res.locals.departamentosResponsables)) {
        res.render(view, {
            estado: "Programacion docente no abierta",
            menu: req.session.menu,
            submenu: req.session.submenu,
            planAcronimo: req.session.planAcronimo,
            departamentosResponsables: res.locals.departamentosResponsables,
            planEstudios: req.session.planEstudios,
            grupos: null
        })
    }
    else if (view === "pdfDraftGenerado" && estados.estadoProgDoc.abierto !== res.locals.progDoc['ProgramacionDocentes.estadoProGDoc'] && estados.estadoProgDoc.listo !== res.locals.progDoc['ProgramacionDocentes.estadoProGDoc']) {
        res.render(view, {
            estado: "Programacion docente no abierta",
            menu: req.session.menu,
            submenu: req.session.submenu,
            planAcronimo: req.session.planAcronimo,
            departamentosResponsables: res.locals.departamentosResponsables,
            planEstudios: req.session.planEstudios,
            grupos: null
        })
    } else {
        let promises = [];
        let promises2 = [];
        let cursosConGrupos = [];
        let profesores = [];
        let asignaturas = [];
        let pdID;
        let anoFinal;
        let semestre;
        switch (view) {
            case "pdfDraftGenerado":
                pdID = res.locals.progDoc['ProgramacionDocentes.identificador']
                anoFinal = 2000 + Number(res.locals.progDoc['ProgramacionDocentes.anoAcademico'][4] + "" + res.locals.progDoc['ProgramacionDocentes.anoAcademico'][5])
                semestre = res.locals.progDoc['ProgramacionDocentes.semestre']     
                break;
            case "pdfCerrado":
                pdID = res.locals.progDoc['identificador']
                anoFinal = 2000 + Number(res.locals.progDoc['anoAcademico'][4] + "" + res.locals.progDoc['anoAcademico'][5])
                semestre = res.locals.progDoc['semestre']   
                break;
        }
        let asignacionsExamen = [];
        switch (semestre) {
            case "I":
                asignacionsExamen.push({ periodo: enumsPD.periodoPD.S1_O, periodoNombre: "Periodo Ordinario 1º Semestre (Enero " +anoFinal+")", asignaturas: [], examenes: [] })
                asignacionsExamen.push({ periodo: enumsPD.periodoPD.S1_E, periodoNombre: "Periodo Extraordinario 1º Semestre (Julio " + anoFinal + ")", asignaturas: [], examenes: [] })
                asignacionsExamen.push({ periodo: enumsPD.periodoPD.S2_O, periodoNombre: "Periodo Ordinario 2º Semestre (Junio " + anoFinal + ")", asignaturas: [], examenes: [] })
                asignacionsExamen.push({ periodo: enumsPD.periodoPD.S2_E, periodoNombre: "Periodo Extraordinario 2º Semestre (Julio " + anoFinal + ")", asignaturas: [], examenes: [] })
                break;
            case "1S":
                asignacionsExamen.push({ periodo: enumsPD.periodoPD.S1_O, periodoNombre: "Periodo Ordinario 1º Semestre (Enero " + anoFinal + ")", asignaturas: [], examenes: [] })
                asignacionsExamen.push({ periodo: enumsPD.periodoPD.S1_E, periodoNombre: "Periodo Extraordinario 1º Semestre (Julio " + anoFinal + ")", asignaturas: [], examenes: [] })
                break;
            case "2S":
                asignacionsExamen.push({ periodo: enumsPD.periodoPD.S2_O, periodoNombre: "Periodo Ordinario 2º Semestre (Junio " + anoFinal + ")", asignaturas: [], examenes: [] })
                asignacionsExamen.push({ periodo: enumsPD.periodoPD.S2_E, periodoNombre: "Periodo Extraordinario 2º Semestre (Julio " + anoFinal + ")", asignaturas: [], examenes: [] })
                break;
            default:
                break;
        }
        //obtengo los cursos que hay en el plan por las asignaturas que tiene el plan
        let promise1 = models.sequelize.query(query = 'SELECT distinct  "curso" FROM public."Asignaturas" a  WHERE (a."ProgramacionDocenteIdentificador" = :pdID) ORDER BY a."curso" ASC;',
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
                include: [{
                    //left join 
                    model: models.AsignacionProfesor, //obtengo los horarios + asignacion profesores
                }],
                order: [
                    [Sequelize.literal('"grupoId"'), 'ASC'],
                ],
                raw: true
            }).each((g) => {
                let curso = cursosConGrupos.find(function (obj) { return obj.curso === g.curso; });
                if (curso) {
                    let semestre = curso.semestres.find(function (obj) { return obj.semestre === Number(g.nombre.split(".")[1]) })
                    if (semestre) {
                        let grupo = semestre.grupos.find(function (obj) { return obj.grupoId === Number(g.grupoId) })
                        if (!grupo){
                            let newGrupo = {};
                            newGrupo.grupoId = g.grupoId;
                            newGrupo.nombre = g.nombre;
                            newGrupo.capacidad = g.capacidad;
                            newGrupo.curso = g.curso;
                            newGrupo.aula = g.aula;
                            newGrupo.idioma = g.idioma;
                            newGrupo.horarios = [];
                            newGrupo.asignaturas = [];
                            semestre.grupos.push(newGrupo)
                            grupo = semestre.grupos.find(function (obj) { return obj.grupoId === Number(g.grupoId) })
                        } let asignatura = grupo.asignaturas.find(function (obj) { return obj.AsignaturaId === Number(g['AsignacionProfesors.AsignaturaId'])})
                        if (!asignatura && (g['AsignacionProfesors.ProfesorId'] !== null || (g['AsignacionProfesors.Dia'] !== null || g['AsignacionProfesors.Nota'])) ) {
                            let newAsignatura = {};
                            newAsignatura.AsignaturaId = Number(g['AsignacionProfesors.AsignaturaId'])
                            newAsignatura.asignacions = [];
                            grupo.asignaturas.push(newAsignatura)
                            asignatura = grupo.asignaturas.find(function (obj) { return obj.AsignaturaId === Number(g['AsignacionProfesors.AsignaturaId']) })
                        } if (g['AsignacionProfesors.ProfesorId'] !== null){
                            asignatura.asignacions.push(g['AsignacionProfesors.ProfesorId'])
                        } if (g['AsignacionProfesors.Dia'] !== null || g['AsignacionProfesors.Nota'] ){
                            let newHorario = {};
                            newHorario.asignaturaId = g['AsignacionProfesors.AsignaturaId']
                            newHorario.dia = g['AsignacionProfesors.Dia']
                            newHorario.horaInicio = g['AsignacionProfesors.HoraInicio']
                            newHorario.duracion = g['AsignacionProfesors.Duracion']
                            newHorario.nota = g['AsignacionProfesors.Nota']
                            grupo.horarios.push(newHorario);
                        } 

                    }
                }
            })
                .then((grupos) => {
                    //console.log(cursosConGrupos);
                    //console.log(cursosConGrupos[0].semestres[0]);
                    //console.log(cursosConGrupos[0].semestres[0].grupos[0]);
                    //console.log(cursosConGrupos[0].semestres[0].grupos[0].asignaturas[4].asignacions)
                    
                })
        })
        //busco las asignaturas con departamento responsable ya que son las que entran en los exámene
        let promise2 =models.Asignatura.findAll({
            where: {
                ProgramacionDocenteIdentificador: pdID,
                DepartamentoResponsable: {
                    [op.ne]: null,
                }
            },
            order: [

                [Sequelize.literal('"Asignatura"."curso"'), 'ASC'],
                [Sequelize.literal('"Examens.periodo"'), 'ASC']
            ],
            raw: true,
            include: [{
                //left join 
                model: models.Examen,
            }]
        })
            .each(function (ej) {
                let as = asignaturas.find(function (x) { return x.identificador === ej.identificador; })
                if (!as){
                    //TODO solo pasar las cosas que me interesan
                    asignaturas.push(ej)
                }
                let periodoExamen = ej['Examens.periodo']
                let p = asignacionsExamen.find(function (obj) { return obj.periodo === periodoExamen; });
                if (p) {
                        let nuevoExamen = {};
                        nuevoExamen.asignatura = ej['acronimo'] !== null ? ej['acronimo'] : ej['nombre'];
                        nuevoExamen.curso = ej['curso'];
                        //debo convertir la fecha a formato dd/mm/yyyy
                        nuevoExamen.fecha = ej['Examens.fecha'].split("-")[2] + "/" + ej['Examens.fecha'].split("-")[1] + "/" + ej['Examens.fecha'].split("-")[0];
                        p.examenes.push(nuevoExamen)
                }
            })
            .then(() => {
                //console.log(asignacionsExamen)
                //console.log(asignacionsExamen[0])
                //console.log(asignacionsExamen[0].examenes[0])
                //console.log(asignaturas)
                //console.log(asignaturas[0])
                })
    let promise3 = models.Persona.findAll({
        attributes: ['email', 'nombre', 'apellido'],
        include: [{
            model: models.Profesor,
            required: true,
        }],
        raw: true
    })
        .each(function (profesor) {
            let nombre = profesor['apellido'] + "," + profesor['nombre']
            let correo = profesor['email']
            nombre = funciones.primerasMayusc(nombre);
            let prof = { nombre: nombre, correo: correo }
            profesores.push(prof);

        })
        .then(function (params) {

            
        }) 
    promises.push(promise1);
    promises.push(promise2);
    promises.push(promise3);
        Promise.all(promises).then(() => {
           promises2.push(
                new Promise(function(resolve,reject){
                    ejs.renderFile("./views/pdfs/pdfAsignaturas.ejs",
                        {
                            asignaturas: asignaturas,
                            cursosConGrupos: cursosConGrupos,
                            profesores: profesores
                        },
                        function (err, str) {
                            if (err){
                                reject(err);
                            }else{
                                resolve(str);
                            }
                        }
                    )
                })
            )
            promises2.push(
                new Promise(function (resolve, reject) {
                    ejs.renderFile("./views/pdfs/pdfGruposyHorarios.ejs",
                        {
                            asignaturas: asignaturas,
                            cursosConGrupos: cursosConGrupos,
                            profesores: profesores
                        },
                        function (err, str) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(str);
                            }
                        }
                    )
                })
            )
            promises2.push(
                new Promise(function (resolve, reject) {
                    ejs.renderFile("./views/pdfs/pdfExamenes.ejs",
                        {
                            asignacionsExamen: asignacionsExamen,
                            cursosConGrupos: cursosConGrupos,
                            pdID: pdID,
                            periodos: enumsPD.periodoPD,
                        },
                        function (err, str) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(str);
                            }
                        }
                    )
                })
            )  
            Promise.all(promises2)
            .then(function(datos){
                //ojo el css del header y el footer no puede ir en el fichero pq no carga debe ir en el propio html
                let html = `<html><head>
                    <link rel='stylesheet' href='stylesheets/pdf.css' />
                </head>
                    `
                html += ` <style>
                    .draft{
                        position:absolute;
                        z-index:0;
                        background:white;
                        display:block;
                        min-height:100%; 
                        min-width:100%;
                        color:yellow;
                    }
                    .draftText{
                    text-align:left;
                    color:lightgrey;
                    font-size:140px;
                    transform:rotate(-45deg);
                    -webkit-transform:rotate(-45deg);
                    }
                    </style>
                    <body>
                 `
                datos.forEach(function (d) {
                    html += d;
                    
                })
                //las imagenes que use en el encabezado o footer debo cargarlas antes y deben ser obtenidas de una url pq lo que te carga la dirección local es después del footer.
               // html += `<img src="images/politecnica.jpg" alt="Politécnica" width="50" height="33">`
                html += `<img style="display:none" src="https://www.portalparados.es/wp-content/uploads/universidad-politecnica-madrid.jpg">`

                html += `</body></html>`
                let file = req.originalUrl.toLowerCase().includes("consultar") ? pdID + '_draft.pdf' : pdID + '.pdf'
                let ruta = './public/pdfs/' + file
                let options = {
                    'text': 'draft',
                    'dstPath': ruta
                }
                let configPdfOptions = req.originalUrl.toLowerCase().includes("consultar") ? configPdfDraft : configPdfCerrado
                pdf.create(html, configPdfOptions).toFile(ruta, function (err, resp) {
                    if (err) return console.log(err);
                    switch (view){
                        case "pdfDraftGenerado":
                            res.render(view,
                                {
                                    file: file,
                                    planAcronimo: req.session.planAcronimo,
                                    planEstudios: req.session.planEstudios,
                                    pdID: pdID,
                                    menu: req.session.menu,
                                    submenu: req.session.submenu,
                                    estado: null,
                                });
                                break;

                        case "pdfCerrado":
                            next();
                            break;
                    }

                    /*res.render('pdfAsignaturas',{
                        asignaturas: asignaturas,
                        cursosConGrupos: cursosConGrupos,
                        profesores: profesores
                    },)*/
                })
            })
                .catch(function (error) {
                    console.log("Error:", error);
                    next(error);
                });
        }).catch(function (error) {
            console.log("Error:", error);
            next(error);
        });     
    }
}