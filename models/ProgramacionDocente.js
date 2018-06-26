// Definicion del modelo ProgramacionDocente:

module.exports = function (sequelize, DataTypes) {
    let ProgramacionDocente = sequelize.define('ProgramacionDocente',
        {

            identificador: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            version: {
                type: DataTypes.INTEGER
            },
            anoAcademico: {
                type: DataTypes.STRING
            },
            semestre: {
                type: DataTypes.ENUM('1S', '2S', 'I')
            },
            estadoProGDoc:{
               type: DataTypes.INTEGER
           },
            fechaProgDpc: {
                type: DataTypes.DATE
            },
            estadoGrupos: {
                type: DataTypes.INTEGER
            },
            //fecha actualización de grupos
            fechaGrupos: {
                type: DataTypes.DATE
            },
            estadoProfesores: {
                type: DataTypes.INTEGER
            },
            //fecha actualización de profesores
            fechaProfesores: {
                type: DataTypes.DATE
            },
            estadoTribunales: {
                type: DataTypes.INTEGER
            },
            //fecha actualización de tribunales
            fechaTribunales: {
                type: DataTypes.DATE
            },
            estadoHorarios: {
                type: DataTypes.INTEGER
            },
            //fecha actualización de horarios
            fechaHorarios: {
                type: DataTypes.DATE
            }, 
            estadoExamenes: {
                type: DataTypes.INTEGER
            },
            //fecha actualización de examenes
            fechaExamenes: {
                type: DataTypes.DATE
            },
            estadoCalendario: {
                type: DataTypes.INTEGER
            },
            //fecha actualización de calendario
            fechaCalendario: {
                type: DataTypes.DATE
            },                  
            archivo:{
                type: DataTypes.JSONB
            }
        },
        {
            timestamps: false
        });
    ProgramacionDocente.removeAttribute('id');
    return ProgramacionDocente;
};
