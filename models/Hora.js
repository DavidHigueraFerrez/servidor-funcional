// Definicion del modelo Hora:

module.exports = function (sequelize, DataTypes) {
    let Hora = sequelize.define('Hora',
        {
            HoraId: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            Dia: {
                type: DataTypes.ENUM('L', 'M', 'X', 'J', 'V', 'S', 'D')
            },
            HoraInicio: {
                type: DataTypes.TIME
            },
            Duracion: {
                type: DataTypes.FLOAT
            }
        },
        {
            timestamps: false
        });
    Hora.removeAttribute('id');
    return Hora;
};