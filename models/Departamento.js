// Definicion del modelo Departamento:

module.exports = function (sequelize, DataTypes) {
    let Departamento = sequelize.define('Departamento',
        {

            codigo: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            nombre: {
                type: DataTypes.STRING,
                validate: { notEmpty: { msg: "Falta nombre" } }
            }

        },
        {
            timestamps: false
        });
    Departamento.removeAttribute('id');
    return Departamento;
};
