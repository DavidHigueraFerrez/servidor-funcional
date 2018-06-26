// Definicion del modelo Persona:

module.exports = function (sequelize, DataTypes) {
    let Persona = sequelize.define('Persona',
        {

            email: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            nombre: {
                type: DataTypes.STRING
            },
            apellido: {
                type: DataTypes.STRING
            }

        },
        {
            timestamps: false   
        });
    Persona.removeAttribute('id');
    return Persona;
};
