// Definicion del modelo Horario:

module.exports = function (sequelize, DataTypes) {
    let Horario = sequelize.define('Horario',
        {},
        {
            timestamps: false
        });
    return Horario;
};