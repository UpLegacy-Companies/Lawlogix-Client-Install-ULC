const { SlashCommandBuilder } = require('@discordjs/builders');
const GunRegistration = require('../database/models/GunRegistration');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('manageguns')
    .setDescription('Manage gun certifications for a Roblox user')
    .addSubcommand(subcommand =>
      subcommand.setName('add')
        .setDescription('Add a gun certification')
        .addStringOption(option =>
          option.setName('robloxusername')
            .setDescription('The Roblox username')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('certification')
            .setDescription('The certification to add')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('remove')
        .setDescription('Remove a gun certification')
        .addStringOption(option =>
          option.setName('robloxusername')
            .setDescription('The Roblox username')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('certification')
            .setDescription('The certification to remove')
            .setRequired(true))),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const robloxUsername = interaction.options.getString('robloxusername');
    const certification = interaction.options.getString('certification');

    try {
      if (subcommand === 'add') {
        await GunRegistration.create({ robloxUsername, certification });
        await interaction.reply({
          content: `Added certification **${certification}** for **${robloxUsername}**.`,
          flags: 64,
        });
      } else if (subcommand === 'remove') {
        const record = await GunRegistration.findOne({ where: { robloxUsername, certification } });

        if (!record) {
          return interaction.reply({
            content: `No certification **${certification}** found for **${robloxUsername}**.`,
            flags: 64,
          });
        }

        await record.destroy();
        await interaction.reply({
          content: `Removed certification **${certification}** for **${robloxUsername}**.`,
          flags: 64,
        });
      }
    } catch (error) {
      console.error('Error managing gun certifications:', error);
      await interaction.reply({
        content: 'An error occurred while managing certifications. Please try again later.',
        flags: 64,
      });
    }
  },
};
