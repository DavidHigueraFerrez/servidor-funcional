// Definicion del modelo Historial:

module.exports = function (sequelize, DataTypes) {
    let Historial = sequelize.define('Historial',
        {
            //el identificador será así: PD:Plan_año_semestre_v.1
            identificador: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            uri: {
                type: DataTypes.STRING
            }

        },
        {
            timestamps: false
        });
    Historial.removeAttribute('id');
    return Historial;
};
