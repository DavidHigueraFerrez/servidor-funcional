// Definicion del modelo Profesor:

module.exports = function (sequelize, DataTypes) {
    let Profesor = sequelize.define('Profesor',
        {

            ProfesorEmail: {
                type: DataTypes.STRING,
                primaryKey: true
            }
        },
        {
            timestamps: false
        });
    Profesor.removeAttribute('id');
    return Profesor;
};
