require('dotenv').config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const config = require('./config.json');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  } else {
    console.error(`Command file "${file}" is missing "data" or "execute".`);
  }
}

// Sync database
const sequelize = require('./database/sequelize');

// Sync database schema
(async () => {
  try {
    await sequelize.sync({ alter: true }); // Automatically add or adjust columns
    console.log('Database synced successfully.');
  } catch (error) {
    console.error('Error syncing database:', error);
  }
})();

// Ready event
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Interaction event
client.on('interactionCreate', async interaction => {
  // Handle slash commands
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('Error executing command:', error);
      await interaction.reply({
        content: 'There was an error executing this command.',
        ephemeral: true
      });
    }
  }

  // Handle select menu and pagination for the leaderboard
  else if (interaction.isStringSelectMenu() && interaction.customId === 'punishment-select') {
    // Fetch leaderboard from database
    const selectValue = interaction.values[0]; // Either "Arrests", "Citations", or "Warnings"
    const limit = 10; // Show top 10 officers

    const officers = await getLeaderboard(selectValue, limit);

    const embed = generateLeaderboardEmbed(officers, selectValue);
    const actionRow = generatePaginationActionRow();

    // Send the embed and pagination buttons
    await interaction.update({
      content: `Leaderboard - ${selectValue}`,
      embeds: [embed],
      components: [actionRow],
      ephemeral: true
    });
  }
});

// Function to fetch the leaderboard data from your database
async function getLeaderboard(selectValue, limit) {
  // Based on the value of selectValue, return the corresponding leaderboard
  switch (selectValue) {
    case 'Arrests':
      return await Offense.findAll({
        attributes: ['officer', [sequelize.fn('COUNT', sequelize.col('offense')), 'offenseCount']],
        group: ['officer'],
        order: [[sequelize.fn('COUNT', sequelize.col('offense')), 'DESC']],
        limit: limit
      });
    case 'Citations':
      return await Offense.findAll({
        where: { offense: 'Citation' }, // Modify if you have a specific field for Citation offenses
        attributes: ['officer', [sequelize.fn('COUNT', sequelize.col('offense')), 'offenseCount']],
        group: ['officer'],
        order: [[sequelize.fn('COUNT', sequelize.col('offense')), 'DESC']],
        limit: limit
      });
    case 'Warnings':
      return await Offense.findAll({
        where: { offense: 'Warning' }, // Modify if you have a specific field for Warning offenses
        attributes: ['officer', [sequelize.fn('COUNT', sequelize.col('offense')), 'offenseCount']],
        group: ['officer'],
        order: [[sequelize.fn('COUNT', sequelize.col('offense')), 'DESC']],
        limit: limit
      });
    default:
      return [];
  }
}

// Function to generate the leaderboard embed
function generateLeaderboardEmbed(officers, selectValue) {
  const embed = new EmbedBuilder()
    .setTitle(`Top Officers - ${selectValue}`)
    .setColor(0x00FF00)
    .setDescription(`Showing the top 10 officers with the most ${selectValue.toLowerCase()}s`);

  if (officers.length === 0) {
    embed.addFields({ name: 'No Data', value: 'There are no officers with recorded offenses.' });
  } else {
    officers.forEach(officer => {
      embed.addFields({
        name: `Officer: ${officer.officer}`,
        value: `Total ${selectValue}: ${officer.offenseCount}`,
        inline: true
      });
    });
  }

  return embed;
}

// Function to generate the pagination action row
function generatePaginationActionRow() {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('previous-page')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('next-page')
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
    );
}

// Login to Discord
client.login(config.token);
