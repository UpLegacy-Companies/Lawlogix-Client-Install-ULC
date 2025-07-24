const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Offense = sequelize.define('Offense', {
  robloxUsername: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  officer: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  discordUserIds: {
    type: DataTypes.STRING, // Stores multiple officer IDs as a comma-separated string
    allowNull: true,
  },
  offense: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  details: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  punishment: {
    type: DataTypes.STRING, // Add this column for punishments
    allowNull: false,
  },
  caseId: {
    type: DataTypes.INTEGER,
    unique: true,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = Offense;
