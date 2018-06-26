// Definicion del modelo Examen:

module.exports = function (sequelize, DataTypes) {
    let Examen = sequelize.define('Examen',
        {

            identificador: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            fecha: {
                type: DataTypes.DATEONLY
            },
            horaInicio: {
                type: DataTypes.TIME
            },
            duracion: {
                type: DataTypes.FLOAT
            },
            aulas: {
                type: DataTypes.ARRAY(DataTypes.STRING)
            }

        },
        {
            timestamps: false
        });
    Examen.removeAttribute('id');
    return Examen;
};
