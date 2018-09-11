let app = require('../app')
let models = require('../models');
let Sequelize = require('sequelize');
const nodemailer = require('nodemailer');
let mail = require('../mail/mail');
const op = Sequelize.Op;
const axios = require('axios');
let estados = require('../estados');


exports.abrirNuevaProgDoc = function (req, res, next) {
    let tipoPD;
    let plan;
    let ano;
    //PD_09TT_201718_1S_v1
    //si es para abrir incidencia
    if (req.body.pdIdentificador){
        tipoPD = req.body.pdIdentificador.split("-")[1].split("_")[3]
        plan = req.body.pdIdentificador.split("-")[1].split("_")[1]
        ano = req.body.pdIdentificador.split("-")[1].split("_")[2]
    }
    //si es para abrir una nueva pd
    else{
        tipoPD = req.body.semestre
        plan = req.body.plan
        ano = req.body.anoAcademico
    }
    //la version puede cambiar la sacamos del pd anterior
    res.locals.identificador = 'PD_' + plan + '_' + ano + '_' + tipoPD + '_v1'
    let pds = [];
    let nuevaPd = {};
    let s1 = false;
    let s2 = false;
    let I = false;
    //las nuevas asignaturas son o nuevas o que cambian de semestre o de curso o de itinerario o que cambian de obligatoria a optativa o al revés
    let nuevasAsignaturas = [];
    let viejasAsignaturas = [];
    let cambioAsignaturas = [];
    let desapareceAsignaturas = [];
    let asignacions = [];

    let gruposToAnadir = [];
    let relacionGrupos = [];

    res.locals.departamentosResponsables = [];

    axios.get("https://www.upm.es/wapi_upm/academico/comun/index.upm/v2/plan.json/" + plan + "/asignaturas?anio=" + ano) 
        .then(function (response) {

           let apiAsignaturas = response.data;
            /*En api upm
            T: Basica
            B: Obligatoria
            O: Optativa
            P: Trabajo de fin de titulacion, tiene curso pero no departamento responsable
            Las practicas son optativas y no tienen depart responsable. pero si curso
            Las asignaturas de intercambio son como las practicas
            Las asignaturas que no se imparten no vienen con curso asignado ni tipo
            */


            /*
            si la pd es semestral buscas la anterior semestral de ese mismo semestre o anual. Pero la más reciente de ambas
            si la pd es anual buscas la anterior anual o las dos anteriores semestrales, lo que sea más reciente.
            Se supone que no puede ocurrir 1S, I, 2S o I, 2S. De todas formas con el orderby se queda con la I primero así que no habrían problemas
            ya que con la I se pueden hacer todos los casos
            También es importante la forma de la clave ppal de la pd ya que ordenamos en funcion de ello.
            */

            models.ProgramacionDocente.findAll({
                attributes: ["identificador", "semestre", "estadoProfesores"],
                where: {
                    PlanEstudioId: plan
                },
                order: [
                    [Sequelize.literal('identificador'), 'DESC'],
                ],
                raw: true
            }).then(function (pd) {
                //console.log(pd)
                for (let i = 0; i < pd.length; i++) {
                    //el segundo elemento del if es para que me coja la pd anterior o igual por si quiero modificar una cuando ya abri otra mas nueva
                    if (tipoPD === '1S' && ano >= pd[i]["identificador"].split("_")[2]) {
                        if (pd[i].semestre === '1S' || pd[i].semestre === 'I') {
                            pds.push(pd[i]);
                            break;
                        }
                    }
                    if (tipoPD === '2S' && ano >= pd[i]["identificador"].split("_")[2]) {
                        if (pd[i].semestre === '2S' || pd[i].semestre === 'I') {
                            pds.push(pd[i]);
                            break;
                        }
                    }
                    if (tipoPD === 'I' && ano >= pd[i]["identificador"].split("_")[2]) {
                        if (pd[i].semestre === 'I' && I === false) {
                            pds.push(pd[i]);
                            I = true;
                            break;
                        } else {
                            if (pd[i].semestre === '1S' && s1 === false && ano >= pd[i]["identificador"].split("_")[2]) {
                                pds.push(pd[i]);
                                s1 = true;
                            }
                            if (pd[i].semestre === '2S' && s2 === false && ano >= pd[i]["identificador"].split("_")[2]) {
                                pds.push(pd[i]);
                                s2 = true;
                            }
                            if (s1 && s2) {
                                break;
                            }
                        }
                    }
                }
                //caso raro que haya varias I y s1 por ejemplo si tengo s1 I s2 se va a dar. En ese caso me quedo con la anual
                if (I && s1 || I && s2) {
                    let index = pds.length - 1;
                    while (index >= 0) {
                        if (pds[index].semestre === '2S' || pds[index].semestre === '1S') {
                            pds.splice(index, 1);
                        }

                        index -= 1;
                    }

                }

                let whereAsignaturas = {};
                whereAsignaturas['$or'] = [];
                //console.log(pds)

                //voy a obtener el identificador del plan y de paso preparo el where para asignaturas
                for (let i = 0; i < pds.length; i++) {
                    whereAsignaturas['$or'].push({ ProgramacionDocenteIdentificador: pds[i].identificador })
                    let ident = pds[i].identificador.split("_");
                    if (ident[0] === 'PD' && ident[1] === plan && ident[2] === ano && ident[3] === tipoPD) {
                        let vers = Number(ident[4].split("v")[1]) + 1;
                        res.locals.identificador = 'PD_' + plan + '_' + ano + '_' + tipoPD + '_v' + vers;
                    }
                }
                nuevaPd.identificador = res.locals.identificador;
                nuevaPd.version = Number(res.locals.identificador.split("_")[4].split("v")[1]);
                nuevaPd.anoAcademico = ano;
                nuevaPd.semestre = tipoPD;
                nuevaPd.estadoProGDoc = -1;
                nuevaPd.fechaProgDoc = new Date();
                nuevaPd.PlanEstudioId = plan;


                let pdToAnadir = models.ProgramacionDocente.build(
                    nuevaPd
                )
                return pdToAnadir.save()
                    .then(() => { // Notice: There are no arguments here, as of right now you'll have to...
                        //se supone que los grupos terminan en .1 o .2 aunque sean para optativas. Si tal definir un grupo de optativas con un flag.
                        let pdId1 = "no programacion"
                        let pdId2 = "no programacion"
                        let cursoGrupo = '%%';
                        pds[0] ? pdId1 = pds[0].identificador : pdId1 = pdId1;
                        pds[1] ? pdId2 = pds[1].identificador : pdId2 = pdId2;

                        switch (tipoPD) {
                            case "1S":
                                cursoGrupo = '%.1'
                                break;
                            case "2S":
                                cursoGrupo = '%.2'
                                break;
                            case "I":
                                cursoGrupo = '%%'
                                break;
                            default:
                                console.log("no implementado otro tipo")
                                break;
                        }


                        return models.sequelize.query(query = 'SELECT distinct  "nombre", g."grupoId", "curso", "capacidad", "aula", "idioma" FROM public."Grupos" g  WHERE (g."ProgramacionDocenteId" = :pdId1 or g."ProgramacionDocenteId" = :pdId2) and g."nombre" LIKE :cursoGrupo  ORDER BY g."nombre" ASC ',
                            { replacements: { pdId1: pdId1, pdId2: pdId2, cursoGrupo: cursoGrupo } },
                        ).then(grupos => {

                            grupos[0].forEach(function (g) {
                                let newGrupo = {};
                                newGrupo.nombre = g.nombre;
                                newGrupo.capacidad = g.capacidad;
                                newGrupo.curso = g.curso;
                                newGrupo.aula = g.aula;
                                newGrupo.idioma = g.idioma;
                                newGrupo.ProgramacionDocenteId = res.locals.identificador;
                                newGrupo.ItinerarioIdentificador = g.ItinerarioIdentificador;
                                gruposToAnadir.push(newGrupo)
                                relacionGrupos.push({ nombre: g.nombre, identificadorViejo: g.grupoId, curso: g.curso })


                            })

                            return models.Grupo.bulkCreate(
                                gruposToAnadir
                            ).then(() => {
                                return models.Grupo.findAll({
                                    attributes: ["grupoId", "nombre", "curso"],
                                    where: {
                                        ProgramacionDocenteId: res.locals.identificador
                                    },
                                    raw: true
                                }).each(function (grupoNuevo) {
                                    let grupoToActualizar = relacionGrupos.find(function (obj) { return obj.nombre === grupoNuevo.nombre; });
                                    grupoToActualizar.identificadorNuevo = grupoNuevo.grupoId;
                                }).then(() => {
                                    return models.Asignatura.findAll({
                                        where: whereAsignaturas,
                                        include: [{
                                            //incluye las asignaciones de profesores y los horarios.
                                            model: models.AsignacionProfesor,
                                            //left join
                                            required: false
                                        }],
                                        raw: true

                                    }).each(function (asignBBDD) {
                                        let cursoCambio = false;
                                        //cambio de tipo es de optativa a otro tipo o al revés
                                        let tipoCambio = false;
                                        //cambio de semestre
                                        let semestreCambio = false;
                                        let hasCurso = true;
                                        let hasDepartamento = true;
                                        let hasSemestre = true;

                                        let nuevaAsignatura = nuevasAsignaturas.find(function (obj) { return obj.codigo === asignBBDD.codigo; });
                                        let viejaAsignatura = viejasAsignaturas.find(function (obj) { return obj.codigo === asignBBDD.codigo; });
                                        let cambioAsignatura = cambioAsignaturas.find(function (obj) { return obj.codigo === asignBBDD.codigo; });


                                        //asignatura que está en la api pero es la primera vez que la metemos con su primera asignación
                                        if (apiAsignaturas[asignBBDD.codigo] && !nuevaAsignatura && !viejaAsignatura && !cambioAsignatura) {
                                            apiAsignatura = apiAsignaturas[asignBBDD.codigo]
                                            asignBBDD.anoAcademico = ano;
                                            asignBBDD.nombre = apiAsignatura["nombre"]
                                            apiAsignatura["nombre_ingles"] === "" ? asignBBDD.nombreIngles = asignBBDD.nombreIngles : asignBBDD.nombreIngles = apiAsignatura["nombre_ingles"];
                                            asignBBDD.creditos = apiAsignatura['credects'];
                                            let tipo = asignBBDD.tipo;
                                            switch (apiAsignatura["codigo_tipo_asignatura"]) {
                                                case "T":
                                                    tipo === 'opt' ? tipoCambio = true : tipoCambio = false;
                                                    asignBBDD.tipo = 'bas';
                                                    break;
                                                case "B":
                                                    tipo === 'opt' ? tipoCambio = true : tipoCambio = false;
                                                    asignBBDD.tipo = 'obl';
                                                    break;
                                                case "O":
                                                    tipo !== 'opt' ? tipoCambio = true : tipoCambio = false;
                                                    asignBBDD.tipo = 'opt';
                                                    break;
                                                case "P":
                                                    asignBBDD.tipo = 'obl';
                                                    break;
                                                default:
                                                    //hay un tipo E que a veces se usa para prácticas
                                                    asignBBDD.tipo = null;
                                                    break;
                                            }
                                            let apiDepartamentos = apiAsignatura['departamentos']
                                            if (apiDepartamentos.length === 0) {
                                                asignBBDD.DepartamentoResponsable = null;
                                                hasDepartamento = false; //no lo uso pq tft si que la quiero y no tiene departamento
                                            }
                                            apiDepartamentos.forEach(function (element, index) {
                                                if (element["responsable"] === "S" || element["responsable"] === "") {
                                                    asignBBDD.DepartamentoResponsable = element["codigo_departamento"]
                                                }
                                            });
                                            let curso = asignBBDD.curso
                                            if (apiAsignatura['curso'] === "") {
                                                hasCurso = false;
                                            } else {
                                                curso === apiAsignatura["curso"] ? cursoCambio = false : cursoCambio = true;
                                                asignBBDD.curso = apiAsignatura["curso"];
                                            }
                                            let semestre = asignBBDD.semestre
                                            let imparticion = apiAsignatura["imparticion"];
                                            if (imparticion['1S'] && imparticion['2S']) {
                                                semestre === "1S-2S" ? semestreCambio = false : semestreCambio = true;
                                                asignBBDD.semestre = "1S-2S"
                                            } else if (imparticion['1S']) {
                                                semestre === "1S" ? semestreCambio = false : semestreCambio = true;
                                                asignBBDD.semestre = "1S"
                                            } else if (imparticion['2S']) {
                                                semestre === "2S" ? semestreCambio = false : semestreCambio = true;
                                                asignBBDD.semestre = "2S"
                                            } else if (imparticion['I']) {
                                                semestre === "I" ? semestreCambio = false : semestreCambio = true;
                                                asignBBDD.semestre = "I"
                                            } else if (imparticion['A']) {
                                                semestre === "A" ? semestreCambio = false : semestreCambio = true;
                                                asignBBDD.semestre = "A"
                                            } else {
                                                asignBBDD.semestre = "";
                                                hasSemestre = false;
                                            }
                                            let As = {}
                                            As.anoAcademico = asignBBDD.anoAcademico;
                                            As.codigo = asignBBDD.codigo;
                                            As.nombre = asignBBDD.nombre;
                                            As.nombreIngles = asignBBDD.nombreIngles;
                                            As.acronimo = asignBBDD.acronimo;
                                            As.curso = asignBBDD.curso;
                                            As.semestre = asignBBDD.semestre;
                                            As.estado = asignBBDD.estado;
                                            As.tipo = asignBBDD.tipo;
                                            As.creditos = asignBBDD.creditos;
                                            As.cupo = asignBBDD.cupo;
                                            As.fechaInicio = asignBBDD.fechaInicio;
                                            As.fechaFin = asignBBDD.fechaFin;
                                            As.DepartamentoResponsable = asignBBDD.DepartamentoResponsable;
                                            As.CoordinadorAsignatura = asignBBDD.CoordinadorAsignatura;
                                            As.ProgramacionDocenteIdentificador = res.locals.identificador;
                                            As.ItinerarioIdentificador = asignBBDD.ItinerarioIdentificador;
                                            As.PresidenteTribunalAsignatura = asignBBDD.PresidenteTribunalAsignatura;
                                            As.VocalTribunalAsignatura = asignBBDD.VocalTribunalAsignatura;
                                            As.SecretarioTribunalAsignatura = asignBBDD.SecretarioTribunalAsignatura;
                                            As.SuplenteTribunalAsignatura = asignBBDD.SuplenteTribunalAsignatura;

                                            if (!cursoCambio && !semestreCambio && !tipoCambio && hasCurso && hasSemestre) {
                                                //no puedo meter asignaturas del primer semestre en el segundo cuando consulto una I para rellenar una 1S
                                                if (tipoPD === "I" || (tipoPD === '1S' && asignBBDD.semestre !== '2S') || (tipoPD === '2S' && asignBBDD.semestre !== '1S')) {

                                                    //console.log(asignBBDD);
                                                    //las asignaciones con profesor y horario a null las creo abajo no aqui
                                                    if (asignBBDD["AsignacionProfesors.ProfesorId"] || asignBBDD["AsignacionProfesors.Dia"] || asignBBDD["AsignacionProfesors.Nota"]) {
                                                        //console.log(asignBBDD)
                                                        let asignacion = {};
                                                        let idGrupo = relacionGrupos.find(function (obj) { return obj.identificadorViejo === asignBBDD['AsignacionProfesors.GrupoId']; });
                                                        if (idGrupo) {
                                                            asignacion.AsignaturaId = asignBBDD.codigo; //este es el viejo después deberé de sustituirlo por el id nuevo no por el codigo el codigo para identificar
                                                            asignacion.GrupoId = idGrupo.identificadorNuevo;
                                                            asignacion.ProfesorId = asignBBDD['AsignacionProfesors.ProfesorId']
                                                            asignacion.Dia = asignBBDD['AsignacionProfesors.Dia']
                                                            asignacion.Nota = asignBBDD['AsignacionProfesors.Nota']
                                                            asignacion.HoraInicio = asignBBDD['AsignacionProfesors.HoraInicio']
                                                            asignacion.Duracion = asignBBDD['AsignacionProfesors.Duracion']
                                                            asignacions.push(asignacion);
                                                        }

                                                    }
                                                    
                                                    viejasAsignaturas.push(As)
                                                }

                                            } else if (!hasCurso || !hasSemestre) {
                                                desapareceAsignaturas.push(As);
                                                /* console.log("Asignatura que desaparece")
                                                 console.log(asignBBDD.nombre)
                                                 console.log(asignBBDD.codigo)*/

                                            } else if (cursoCambio || semestreCambio || tipoCambio) {
                                                if (tipoPD === "I" || (tipoPD === '1S' && asignBBDD.semestre !== '2S') || (tipoPD === '2S' && asignBBDD.semestre !== '1S')) {
                                                    // Ahora mismo si una asignatura cambia en algo lo unico que sigue es el tribunal el horario y los profesores no siguen

                                                    cambioAsignaturas.push(As);
                                                    /* console.log("CursoCambio:" +cursoCambio+ " semestreCambio:" +semestreCambio+ " tipoCambio:" +tipoCambio)
                                                     console.log("Asignatura que cambia")
                                                     console.log(asignBBDD.nombre)
                                                     console.log(asignBBDD.codigo)*/
                                                }

                                            }


                                        }//asignación nueva en una asignatura que ya meti
                                        else if (apiAsignaturas[asignBBDD.codigo] && viejaAsignatura) {
                                            if (asignBBDD["AsignacionProfesors.ProfesorId"] || asignBBDD["AsignacionProfesors.Dia"] || asignBBDD["AsignacionProfesors.Nota"]) {
                                                //console.log(asignBBDD)
                                                //la asignacion es de profesor o horario
                                                let asignacion = {};
                                                //console.log(relacionGrupos)
                                                //console.log(asignBBDD)
                                                let idGrupo = relacionGrupos.find(function (obj) { return obj.identificadorViejo === asignBBDD['AsignacionProfesors.GrupoId']; });
                                                if (idGrupo) {
                                                    asignacion.AsignaturaId = asignBBDD.codigo; //este es el viejo después deberé de sustituirlo por el id nuevo no por el codigo el codigo para identificar
                                                    asignacion.GrupoId = idGrupo.identificadorNuevo;
                                                    asignacion.ProfesorId = asignBBDD['AsignacionProfesors.ProfesorId']
                                                    asignacion.Dia = asignBBDD['AsignacionProfesors.Dia']
                                                    asignacion.Nota = asignBBDD['AsignacionProfesors.Nota']
                                                    asignacion.HoraInicio = asignBBDD['AsignacionProfesors.HoraInicio']
                                                    asignacion.Duracion = asignBBDD['AsignacionProfesors.Duracion']
                                                    asignacions.push(asignacion);
                                                }

                                            }
                                        } //asignatura que cambia de cuatrimestre o curso o tipo solo meto los profesores en el primer grupo y sin repetirh y no meto horarios
                                        else if (apiAsignaturas[asignBBDD.codigo] && cambioAsignatura) {
                                            if (asignBBDD["AsignacionProfesors.ProfesorId"]) {
                                                //console.log(asignBBDD)
                                                let asignacion = {};
                                                asignacion.AsignaturaId = asignBBDD.codigo; //este es el viejo después deberé de sustituirlo por el id nuevo no por el codigo el codigo para identificar
                                                asignacion.ProfesorId = asignBBDD['AsignacionProfesors.ProfesorId']
                                                for (let i = 0; i < relacionGrupos.length; i++) {
                                                    if (relacionGrupos[i].curso === Number(asignBBDD.curso)) {
                                                        asignacion.GrupoId = relacionGrupos[i].identificadorNuevo;
                                                        // no meto profesores repetidos
                                                        let asigEsxitente = asignacions.find(function (obj) { return (obj.GrupoId === asignacion.GrupoId && obj.AsignaturaId === asignacion.AsignaturaId && obj.ProfesorId === asignacion.ProfesorId) });
                                                        if (!asigEsxitente) {
                                                            asignacions.push(asignacion);
                                                        }
                                                        break;
                                                    }


                                                }

                                            }
                                        }
                                        //asignatura que desaparece, no hace nada. Es pq una asignatura que desaparece puede tener muchas asignaciones
                                        else {
                                            /*console.log("Asignatura que desaparece")
                                            console.log(asignBBDD.nombre)
                                            console.log(asignBBDD.codigo)*/
                                        }

                                        //ahora debo comprobar que asignaturas son nuevas de api upm
                                    }).then(function (asignaturasBBDD) {

                                        for (let apiCodigo in apiAsignaturas) {
                                            let apiAsignEncontrada = apiAsignaturas[apiCodigo];
                                            let asignExisteBBDD = asignaturasBBDD.find(function (obj) { return obj.codigo === apiAsignEncontrada.codigo; });
                                            let semestre = ""
                                            let imparticion = apiAsignEncontrada["imparticion"];
                                            if (imparticion['1S'] && imparticion['2S']) {
                                                semestre = "1S-2S"
                                            } else if (imparticion['1S']) {
                                                semestre = "1S"
                                            } else if (imparticion['2S']) {
                                                semestre = "2S"
                                            } else if (imparticion['I']) {
                                                semestre = "I"
                                            } else if (imparticion['A']) {
                                                semestre = "A"
                                            } else {
                                                semestre = "";
                                            }
                                            let apiDepartamentos = apiAsignEncontrada['departamentos']
                                            let depResponsable = null
                                            if (apiDepartamentos.lenth === 0) {
                                                depResponsable = null;
                                            }
                                            apiDepartamentos.forEach(function (element, index) {
                                                if (element["responsable"] === "S" || element["responsable"] === "") {
                                                    depResponsable = element["codigo_departamento"]
                                                }
                                            });
                                            // nueva asignatura a anadir. Es una asignatura si tiene grupo, semestre y departamentoResponsable ¿? duda y solo cojo las asignaturas que interesan
                                            if (!asignExisteBBDD && apiAsignEncontrada['curso'] !== "" && semestre !== "" && (tipoPD === "I" || (tipoPD === '1S' && semestre !== '2S') || (tipoPD === '2S' && semestre !== '1S'))) {
                                                let nuevaAsign = {};
                                                nuevaAsign.anoAcademico = ano;
                                                nuevaAsign.codigo = apiAsignEncontrada.codigo;
                                                nuevaAsign.nombre = apiAsignEncontrada.nombre;
                                                nuevaAsign.nombreIngles = apiAsignEncontrada["nombre_ingles"];
                                                nuevaAsign.curso = apiAsignEncontrada['curso'];
                                                nuevaAsign.semestre = semestre;
                                                nuevaAsign.DepartamentoResponsable = depResponsable;
                                                nuevaAsign.estado = "S";
                                                nuevaAsign.creditos = apiAsignEncontrada['credects'];
                                                nuevaAsign.ProgramacionDocenteIdentificador = res.locals.identificador;
                                                switch (apiAsignEncontrada["codigo_tipo_asignatura"]) {
                                                    case "T":
                                                        nuevaAsign.tipo = 'bas';
                                                        break;
                                                    case "B":
                                                        nuevaAsign.tipo = 'obl';
                                                        break;
                                                    case "O":
                                                        nuevaAsign.tipo = 'opt';
                                                        break;
                                                    case "P":
                                                        nuevaAsign.tipo = 'obl';
                                                        break;
                                                    default:
                                                        //hay un tipo E que a veces se usa para prácticas
                                                        nuevaAsign.tipo = null;
                                                        break;
                                                }
                                                nuevasAsignaturas.push(nuevaAsign);    
                                            }
                                        }
                                        let asignaturasToAnadir = [];
                                        asignaturasToAnadir = asignaturasToAnadir.concat(nuevasAsignaturas);
                                        asignaturasToAnadir = asignaturasToAnadir.concat(viejasAsignaturas);
                                        asignaturasToAnadir = asignaturasToAnadir.concat(cambioAsignaturas);
                                        return models.Asignatura.bulkCreate(
                                            asignaturasToAnadir
                                        ).then(() => {
                                            return models.Asignatura.findAll({
                                                attributes: ["identificador", "codigo", "DepartamentoResponsable"],
                                                where: {
                                                    ProgramacionDocenteIdentificador: res.locals.identificador
                                                },
                                                raw: true
                                            }).each(function (asignaturaNueva) {
                                                //veo todos los departamentos responsables para actualizar la pd en estado tribunales y estado 
                                                let index = res.locals.departamentosResponsables.indexOf(asignaturaNueva.DepartamentoResponsable)
                                                if (index < 0 && asignaturaNueva.DepartamentoResponsable) {
                                                    res.locals.departamentosResponsables.push(asignaturaNueva.DepartamentoResponsable)
                                                }
                                                //actualizo los identificadores de la asignatura que antes los dejé con el código de la vieja
                                                while (asignacions.find(function (obj) { return obj.AsignaturaId === asignaturaNueva.codigo; })) {
                                                    let asignacionToActualizar = asignacions.find(function (obj) { return obj.AsignaturaId === asignaturaNueva.codigo; })
                                                    asignacionToActualizar.AsignaturaId = asignaturaNueva.identificador;
                                                }
                                            }).then(() => {
                                                return models.AsignacionProfesor.bulkCreate(
                                                    asignacions
                                                ).then(() => {
                                                    next();
                                                })
                                            })

                                        })
                                    })

                                })

                            })
                        })
                    })
            })
            
        })
        .catch(function (error) {
            console.log("Error:", error);
            //TODO BORRAR LA PD Y LO QUE CAE DE ELLA PQ DIO ERROR Y VER SI EL ERROR ES ITNERNO TAMBIEN HACE ESTO
            next(error);
        });

}


    /* es decir si una asignatura cambia de semestre o curso o itinerario se trata como una nueva. 
    Si cambia de obligatoria a optatvia se meterá en el grupo de optativa sin copiar profesores
    si cambia de optativa a obligatoria se meterá con los grupos del curso sin profesores
    */

    /*
       

    /*if del get, si está le metes todo, ves si cambia de curso, si no hay curso es que no se da 
    si cambia de curso o de tipo, o de semestre la metes en los grupos que le corresponda
    si no coges los de la programación pasada y los metes con un bulk create
    debes copiar el tribunal de la asignatura si el código no cambia
    */
    /* despues el horario te lo descargas tal cual y las filas que tengan la asignatura y la asignatura tenga el grupo las copias
    sino no.
     */

    /*
    DELETE FROM public."ProgramacionDocentes"
WHERE identificador = 'PD_09TT_201819_1S_v5';
    delete  FROM public."Grupos"
WHERE "ProgramacionDocenteId" is null;
	delete  FROM public."Asignaturas"
WHERE "ProgramacionDocenteIdentificador" is null;
	delete  FROM public."AsignacionProfesors"
WHERE "GrupoId" is null;
delete  FROM public."PlanEstudios"
WHERE "nombre" is null;

    */


