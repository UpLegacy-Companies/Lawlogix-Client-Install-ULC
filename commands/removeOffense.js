const { SlashCommandBuilder } = require('@discordjs/builders');
const Offense = require('../database/models/Offense'); // Ensure this path is correct

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removeoffense')
    .setDescription('Remove an offense from a user record by Case ID')
    .addIntegerOption(option =>
      option.setName('caseid')
        .setDescription('The Case ID of the offense to remove')
        .setRequired(true)),
  async execute(interaction) {
    const caseId = interaction.options.getInteger('caseid');

    try {
      // Fetch the offense record by Case ID
      const offense = await Offense.findOne({ where: { caseId } });

      // Check if the offense exists
      if (!offense) {
        return interaction.reply({
          content: `No offense found with Case ID **${caseId}**.`,
          ephemeral: true,
        });
      }

      // Delete the offense
      await offense.destroy();
      await interaction.reply({
        content: `Offense with Case ID **${caseId}** has been successfully removed.`,
      });
    } catch (error) {
      console.error('Error removing offense:', error);
      await interaction.reply({
        content: 'An error occurred while removing the offense. Please try again later.',
        ephemeral: true,
      });
    }
  },
};
