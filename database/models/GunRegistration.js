const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const GunRegistration = sequelize.define('GunRegistration', {
  robloxUsername: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  certification: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = GunRegistration;
