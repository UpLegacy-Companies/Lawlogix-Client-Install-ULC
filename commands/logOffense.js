const { SlashCommandBuilder } = require('@discordjs/builders');
const Offense = require('../database/models/Offense');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logoffense')
    .setDescription('Log an offense against a Roblox user')
    .addStringOption(option =>
      option.setName('robloxusername')
        .setDescription('The Roblox username of the offender')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('offense')
        .setDescription('The offense committed')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('details')
        .setDescription('Details about the offense')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('punishment')
        .setDescription('Select the punishment type')
        .setRequired(true)
        .addChoices(
          { name: 'Warning', value: 'Warning' },
          { name: 'Citation', value: 'Citation' },
          { name: 'Jail', value: 'Jail' }
        ))
    .addUserOption(option =>
      option.setName('officer1')
        .setDescription('The first Discord officer involved')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('officer2')
        .setDescription('The second Discord officer involved (optional)'))
    .addUserOption(option =>
      option.setName('officer3')
        .setDescription('The third Discord officer involved (optional)')),
  async execute(interaction) {
    const robloxUsername = interaction.options.getString('robloxusername');
    const offense = interaction.options.getString('offense');
    const details = interaction.options.getString('details');
    const punishment = interaction.options.getString('punishment');

    const officer1 = interaction.options.getUser('officer1');
    const officer2 = interaction.options.getUser('officer2');
    const officer3 = interaction.options.getUser('officer3');

    const discordUserIds = [officer1, officer2, officer3]
      .filter(officer => officer) // Remove undefined entries
      .map(officer => officer.id)
      .join(',');

    const caseId = Math.floor(1000 + Math.random() * 9000);

    try {
      await Offense.create({
        robloxUsername,
        offense,
        details,
        punishment,
        caseId,
        officer: interaction.user.username,
        discordUserIds,
        date: new Date(),
      });

      await interaction.reply({
        content: `Offense logged for **${robloxUsername}** with Case ID **${caseId}** and punishment **${punishment}**. Officers: ${discordUserIds.split(',').map(id => `<@${id}>`).join(', ')}`,
        flags: 64,
      });
    } catch (error) {
      console.error('Error logging offense:', error);
      await interaction.reply({
        content: 'An error occurred while logging the offense. Please try again later.',
        flags: 64,
      });
    }
  },
};
