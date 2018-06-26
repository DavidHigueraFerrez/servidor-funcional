// Definicion del modelo TribunalAsignatura:

module.exports = function (sequelize, DataTypes) {
    let TribunalAsignatura = sequelize.define('TribunalAsignatura',
        {
            identificador: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            }
        },
        {
            timestamps: false
        });
    TribunalAsignatura.removeAttribute('id');
    return TribunalAsignatura;
};