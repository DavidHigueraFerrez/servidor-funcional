// Definicion del modelo Grupo:

module.exports = function (sequelize, DataTypes) {
    let Grupo = sequelize.define('Grupo',
        {
            grupoId: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            nombre: {
                type: DataTypes.STRING
            },
            capacidad:{
                type: DataTypes.INTEGER
            },
            curso: {
                type: DataTypes.INTEGER
            },
            aula: {
                type: DataTypes.STRING
            },
            idioma: {
                type: DataTypes.ENUM('ES', 'EN')   //español o ingles
            }
        },
        {
            timestamps: false
        });
    Grupo.removeAttribute('id');
    return Grupo;
};
