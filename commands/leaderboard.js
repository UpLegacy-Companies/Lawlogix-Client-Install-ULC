const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Offense = require('../database/models/Offense');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the leaderboard of officers with the most arrests/citations/warnings.')
    .addStringOption(option =>
      option.setName('punishment')
        .setDescription('Select the type of punishment to filter by.')
        .setRequired(true)
        .addChoices(
          { name: 'Jail', value: 'Jail' }, // Changed from Arrest to Jail to match logoffense.js
          { name: 'Citation', value: 'Citation' },
          { name: 'Warning', value: 'Warning' }
        )),
  async execute(interaction) {
    const punishmentType = interaction.options.getString('punishment');

    try {
      // Fetch all offenses for the selected punishment
      const offenses = await Offense.findAll({
        where: { punishment: punishmentType },
        attributes: ['discordUserIds'],
      });

      if (offenses.length === 0) {
        return interaction.reply({
          content: `No offenses of type **${punishmentType}** have been logged yet.`,
          ephemeral: true,
        });
      }

      // Count offenses per officer by splitting discordUserIds
      const officerCounts = {};
      for (const offense of offenses) {
        if (offense.discordUserIds) {
          const officerIds = offense.discordUserIds.split(',').filter(id => id);
          for (const officerId of officerIds) {
            officerCounts[officerId] = (officerCounts[officerId] || 0) + 1;
          }
        }
      }

      // Convert to array and sort by offense count
      const officers = Object.entries(officerCounts)
        .map(([officerId, offenseCount]) => ({ officerId, offenseCount }))
        .sort((a, b) => b.offenseCount - a.offenseCount)
        .slice(0, 10); // Limit to top 10

      // Fetch Discord mentions for the officers
      const officersWithMentions = await Promise.all(
        officers.map(async officer => {
          try {
            if (!/^\d+$/.test(officer.officerId)) {
              console.error(`Invalid officer ID: ${officer.officerId}`);
              return { mentions: `Invalid User ID: ${officer.officerId}`, offenseCount: officer.offenseCount };
            }
            const user = await interaction.client.users.fetch(officer.officerId);
            return { mentions: `<@${user.id}>`, offenseCount: officer.offenseCount };
          } catch (error) {
            console.error(`Error fetching user mention for officer ${officer.officerId}:`, error);
            return { mentions: 'Unknown User', offenseCount: officer.offenseCount };
          }
        })
      );

      // Create the leaderboard embed
      let leaderboardText = officersWithMentions
        .map((officer, index) => `${index + 1}. ${officer.mentions} - ${officer.offenseCount} ${punishmentType}(s)`)
        .join('\n');

      const embed = new EmbedBuilder()
        .setTitle(`${punishmentType} Leaderboard`)
        .setDescription(leaderboardText || 'No data available.')
        .setColor('#FF0000')
        .setTimestamp();

      // Pagination (previous/next buttons)
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('previous')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
      );

      // Send the embed with pagination buttons
      const message = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true,
      });

      // Pagination logic
      const resultsPerPage = 10;
      let currentPage = 1;

      const filter = i => i.user.id === interaction.user.id;
      const collector = message.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async i => {
        if (i.customId === 'next') {
          currentPage++;
        } else if (i.customId === 'previous') {
          currentPage = Math.max(1, currentPage - 1);
        }

        // Fetch paged officers
        const pagedOfficers = Object.entries(officerCounts)
          .map(([officerId, offenseCount]) => ({ officerId, offenseCount }))
          .sort((a, b) => b.offenseCount - a.offenseCount)
          .slice((currentPage - 1) * resultsPerPage, currentPage * resultsPerPage);

        if (pagedOfficers.length === 0 && currentPage > 1) {
          currentPage--;
          return;
        }

        // Fetch mentions for paged officers
        const pagedOfficersWithMentions = await Promise.all(
          pagedOfficers.map(async officer => {
            try {
              if (!/^\d+$/.test(officer.officerId)) {
                console.error(`Invalid officer ID: ${officer.officerId}`);
                return { mentions: `Invalid User ID: ${officer.officerId}`, offenseCount: officer.offenseCount };
              }
              const user = await interaction.client.users.fetch(officer.officerId);
              return { mentions: `<@${user.id}>`, offenseCount: officer.offenseCount };
            } catch (error) {
              console.error(`Error fetching user mention for officer ${officer.officerId}:`, error);
              return { mentions: 'Unknown User', offenseCount: officer.offenseCount };
            }
          })
        );

        leaderboardText = pagedOfficersWithMentions
          .map((officer, index) => `${(currentPage - 1) * resultsPerPage + index + 1}. ${officer.mentions} - ${officer.offenseCount} ${punishmentType}(s)`)
          .join('\n') || 'No more data available.';

        embed.setDescription(leaderboardText);
        await i.update({ embeds: [embed], components: [row] });
      });

      collector.on('end', async () => {
        row.components.forEach(button => button.setDisabled(true));
        await interaction.editReply({ components: [row] });
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      await interaction.reply({
        content: 'An error occurred while fetching the leaderboard. Please try again later.',
        ephemeral: true,
      });
    }
  },
};