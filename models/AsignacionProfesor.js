// Definicion del modelo AsignacionProfesor:

module.exports = function (sequelize, DataTypes) {
    let AsignacionProfesor = sequelize.define('AsignacionProfesor',
        {
            identificador: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
        },
        {
            timestamps: false
        });
    return AsignacionProfesor;
};
