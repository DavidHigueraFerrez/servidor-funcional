let path = require('path');


// Cargar ORM
let Sequelize = require('sequelize');

//    DATABASE_URL = postgres://user:passwd@host:port/database

//despliegue
let sequelize = new Sequelize('postgres://crm:1234@localhost:5432/gestiondocente');
//local
//let sequelize = new Sequelize('postgres://postgres:1234@localhost:5432/GestionDocente');


// Importar la definicion de las tablas 
let Departamento = sequelize.import(path.join(__dirname, 'Departamento'));
let Asignatura = sequelize.import(path.join(__dirname, 'Asignatura'));
let Examen  = sequelize.import(path.join(__dirname,'Examen'));
let Grupo = sequelize.import(path.join(__dirname, 'Grupo'));
let Historial = sequelize.import(path.join(__dirname, 'Historial'));
let Persona = sequelize.import(path.join(__dirname, 'Persona'));
let PlanEstudio = sequelize.import(path.join(__dirname, 'PlanEstudio'));
let Profesor = sequelize.import(path.join(__dirname, 'Profesor'));
let AsignacionProfesor = sequelize.import(path.join(__dirname, 'AsignacionProfesor'));
let DireccionDepartamento = sequelize.import(path.join(__dirname, 'DireccionDepartamento'));
let ProgramacionDocente = sequelize.import(path.join(__dirname, 'ProgramacionDocente'));
let TribunalAsignatura = sequelize.import(path.join(__dirname, 'TribunalAsignatura'));
let Horario = sequelize.import(path.join(__dirname, 'Horario'));
let Hora = sequelize.import(path.join(__dirname, 'Hora'));
let Rol = sequelize.import(path.join(__dirname, 'Rol'));

//Relacion 1 a N entre DireccionDepartamento y Profesor
Profesor.hasMany(DireccionDepartamento,  {foreignKey: 'DirectorDepartamento'});
DireccionDepartamento.belongsTo(Departamento, { as: 'Director', foreignKey: 'DirectorDepartamento' });

Profesor.hasMany(DireccionDepartamento,  {foreignKey: 'ResponsableDocenteDepartamento'});
DireccionDepartamento.belongsTo(Departamento, { as: 'Responsable', foreignKey: 'ResponsableDocenteDepartamento' });

// Relacion 1 a 1 entre Profesor y Persona:
Persona.hasOne(Profesor, {foreignKey: 'ProfesorEmail'});

//Relacion 1 a N entre Departamento y Profesor:
Departamento.hasMany(Profesor, {foreignKey:'DepartamentoCodigo'})
Profesor.belongsTo(Departamento, {foreignKey:'DepartamentoCodigo'})

//Relacion 1 a N entre Departamento y Asignatura:
Departamento.hasMany(Asignatura, {foreignKey:'DepartamentoResponsable'})
Asignatura.belongsTo(Departamento,{foreignKey:'DepartamentoResponsable'})

//Relacion 1 a N entre Asignatura y Examen
Asignatura.hasMany(Examen)
Examen.belongsTo(Asignatura)

//Relacion 1 a N entre programacion docente y grupo
ProgramacionDocente.hasMany(Grupo, { foreignKey: 'ProgramacionDocenteId' })
Grupo.belongsTo(ProgramacionDocente, { foreignKey: 'ProgramacionDocenteId' })

//Relacion 1 a N entre Profesor y Asignatura:
Profesor.hasMany(Asignatura, { foreignKey: 'CoordinadorAsignatura'})
Asignatura.belongsTo(Profesor, { as: 'Coordinador',foreignKey: 'CoordinadorAsignatura'})

//Relacion N a N a N entre Profesor,Asignatura y Grupo a través de AsignacionProfesor:
Profesor.hasMany(AsignacionProfesor, { foreignKey: 'ProfesorId' })
AsignacionProfesor.belongsTo(Profesor, { foreignKey: 'ProfesorId' })

Asignatura.hasMany(AsignacionProfesor, { foreignKey: 'AsignaturaId' })
AsignacionProfesor.belongsTo(Asignatura, { foreignKey: 'AsignaturaId' })

Grupo.hasMany(AsignacionProfesor, { foreignKey: 'GrupoId' })
AsignacionProfesor.belongsTo(Grupo, { foreignKey: 'GrupoId' })




//Relacion N a N a entre Grupo y Asignatura
Grupo.belongsToMany(Asignatura, { through: 'Horario' });
Asignatura.belongsToMany(Grupo, { through: 'Horario' });


//Relacion 1 a N entre Horario y Hora
Horario.hasMany(Hora, { foreignKey: 'HorarioId' });
Hora.belongsTo(Horario, { foreignKey: 'HorarioId' });


//Relacion 1 a N entre Tribunal y Asignatura (En realidad es uno a uno, pero da igual el 1 a N es un tipo de 1 a 1)
TribunalAsignatura.hasMany(Asignatura,{foreignKey:'TribunalIdentificador'})
Asignatura.belongsTo(TribunalAsignatura, { foreignKey: 'TribunalIdentificador' });
//TribunalAsignatura.hasOne

//Relacion 1 a N  entre profesor TribunalAsignatura (para Presidente, Secretario, Vocal y suplente)
Profesor.hasMany(TribunalAsignatura, { foreignKey: 'PresidenteTribunalAsignatura' });
TribunalAsignatura.belongsTo(Profesor, { as: 'Presidente', foreignKey: 'PresidenteTribunalAsignatura' });

Profesor.hasMany(TribunalAsignatura, { foreignKey: 'VocalTribunalAsignatura' });
TribunalAsignatura.belongsTo(Profesor, { as: 'Vocal', foreignKey: 'VocalTribunalAsignatura' });

Profesor.hasMany(TribunalAsignatura, { foreignKey: 'SecretarioTribunalAsignatura' });
TribunalAsignatura.belongsTo(Profesor, { as: 'Secretario', foreignKey: 'SecretarioTribunalAsignatura' });

Profesor.hasMany(TribunalAsignatura, { foreignKey: 'SuplenteTribunalAsignatura' });
TribunalAsignatura.belongsTo(Profesor, { as: 'Suplente', foreignKey: 'SuplenteTribunalAsignatura' });

//Relacion 1 a N Profesor y PlanEstudio (JefeEstudio, subdirectorPosgrado CoordinadorTitulacion, DelegadoJefeEstudio, DelegadoSubdirect DelegadoCoordinadorTitulacion); Persona y PlanEstudio (Secretario) 
Profesor.hasMany(PlanEstudio, { foreignKey: 'JefeEstudioPlanEstudio' });
PlanEstudio.belongsTo(Profesor, { as: 'JefeEstudio', foreignKey: 'JefeEstudioPlanEstudio' });

Profesor.hasMany(PlanEstudio, { foreignKey: 'JefeEstudioDelegadoPlanEstudio' });
PlanEstudio.belongsTo(Profesor, { as: 'JefeEstudioDelegado', foreignKey: 'JefeEstudioDelegadoPlanEstudio' });

Profesor.hasMany(PlanEstudio, { foreignKey: 'SubdirectorPosgradoPlanEstudio' });
PlanEstudio.belongsTo(Profesor, { as: 'SubdirectorPosgrado', foreignKey: 'SubdirectorPosgradoPlanEstudio' });

Profesor.hasMany(PlanEstudio, { foreignKey: 'SubdirectorPosgradoDelegadoPlanEstudio' });
PlanEstudio.belongsTo(Profesor, { as: 'SubdirectorPosgradoDelegado', foreignKey: 'SubdirectorPosgradoDelegadoPlanEstudio' });


Profesor.hasMany(PlanEstudio, { foreignKey: 'CoordinadorTitulacionPlanEstudio' });
PlanEstudio.belongsTo(Profesor, { as: 'CoordinadorTitulacion', foreignKey: 'CoordinadorTitulacionPlanEstudio' });

Profesor.hasMany(PlanEstudio, { foreignKey: 'CoordinadorTitulacionDelegadoPlanEstudio' });
PlanEstudio.belongsTo(Profesor, { as: 'CoordinadorTitulacionDelegado', foreignKey: 'CoordinadorTitulacionDelegadoPlanEstudio' });

//Relacion 1 a N Persona y PlanEstudio (Secretario)
Persona.hasMany(PlanEstudio, { foreignKey: 'SecretarioPlanEstudio' });
PlanEstudio.belongsTo(Persona, { as: 'Secretario', foreignKey: 'SecretarioPlanEstudio' });

//Relacion N a N Profesor y PlanEstudio (DirectorDepartamento y DirectorDepartamentoDelegado)
//Para saber si es delegado se define una variable boolean en la tabla DireccionDepartamento
//Profesor.belongsToMany(PlanEstudio, { through: 'DireccionDepartamento' });
//PlanEstudio.belongsToMany(Profesor, { through: 'DireccionDepartamento' });


//Relacion 1 a N PlanEstudio y ProgramacionDocente
PlanEstudio.hasMany(ProgramacionDocente, { foreignKey: 'PlanEstudioId' });
ProgramacionDocente.belongsTo(PlanEstudio, { foreignKey: 'PlanEstudioId' });

//Relacion 1 a N Programacion Docente y Asignatura si hay varias prog doc en un año se repetiran las asignaturas en labbdd
ProgramacionDocente.hasMany(Asignatura);
Asignatura.belongsTo(ProgramacionDocente);

// Relacion 1 a 1 entre Historial y Programación Docente: estan en tablas distintas pq la PD se puede borrar pero el historial no. 
//Importante el orden de la relación pq sino te cargas a historial al cargarte a PD
Historial.hasOne(ProgramacionDocente, { foreignKey: 'HistorialID' });

//Relación N a N entre departamento y plan de estudios
PlanEstudio.belongsToMany(Departamento, { through: 'Rol' });
Departamento.belongsToMany(PlanEstudio, { through: 'Rol' });

//Relación 1 a N entre persona y rol
Persona.hasMany(Rol)
Rol.belongsTo(Persona)


//Crear tablas pendientes
sequelize.sync();

//Exportamos modelos
exports.Profesor = Profesor; // exportar definición de tabla Profesor
exports.AsignacionProfesor = AsignacionProfesor; //exportar definición de tabla AsignaciónProfesor
exports.Persona = Persona;   // exportar definición de tabla Persona
exports.Departamento = Departamento; // exportar definición de tabla Departamento
exports.Asignatura = Asignatura; // exportar definición de tabla Asignatura
exports.Grupo = Grupo; // exportar definición de tabla Grupo
exports.Horario = Horario; // exportar definición de tabla Horario
exports.Hora = Hora; //exporta definición de tabla Hora
exports.TribunalAsignatura = TribunalAsignatura; // exportar definición de tabla TribunalAsignatura
exports.PlanEstudio = PlanEstudio; // exportar definición de tabla PlanEstudio
exports.DireccionDepartamento = DireccionDepartamento; // exportar definición de tabla PlanEstudio
exports.ProgramacionDocente = ProgramacionDocente; // exportar definición de tabla ProgramacionDocente
exports.Examen = Examen; // exportar definición de tabla Examen
exports.Historial = Historial; // exportar definición de tabla Historial
exports.Rol = Rol; //exportar definición de tabla Rol
exports.sequelize = sequelize;
