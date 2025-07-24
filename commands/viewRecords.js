const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const Offense = require('../database/models/Offense');
const GunRegistration = require('../database/models/GunRegistration');
const noblox = require('noblox.js');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('records')
    .setDescription('View all offenses and licenses of a Roblox user')
    .addStringOption(option =>
      option.setName('robloxusername')
        .setDescription('The Roblox username to view records for')
        .setRequired(true)),
  async execute(interaction) {
    const robloxUsername = interaction.options.getString('robloxusername');

    try {
      // Authenticate noblox.js with the Roblox token
      try {
        await noblox.setCookie(config.robloxToken);
        console.log(`Authenticated noblox.js for user ${robloxUsername}`);
      } catch (error) {
        console.error(`Error setting Roblox cookie for ${robloxUsername}:`, error);
      }

      // Fetch offenses
      const offenses = await Offense.findAll({ where: { robloxUsername } });

      // Fetch gun licenses
      const licenses = await GunRegistration.findAll({ where: { robloxUsername } });
      const gunLicenses = licenses.map(license => license.certification).join(', ') || 'None';

      // Fetch Roblox profile photo
      let profilePicture = null;
      try {
        const userId = await noblox.getIdFromUsername(robloxUsername);
        const userInfo = await noblox.getPlayerThumbnail([userId], '720x720', 'png');
        profilePicture = userInfo[0]?.imageUrl || null;
      } catch (error) {
        console.error(`Error fetching profile picture for ${robloxUsername}:`, error);
      }

      // Define multiple group IDs to check
      const groupIds = [5933679, 2782840]; // Add more IDs as needed
      let groupInfo = [];

      try {
        // Fetch the user's Roblox user ID
        const userId = await noblox.getIdFromUsername(robloxUsername);

        // Check each group ID for membership
        for (const groupId of groupIds) {
          try {
            const rank = await noblox.getRankInGroup(groupId, userId);
            const groupData = await noblox.getGroup(groupId);
            if (rank > 0) {
              // Fetch role name from group roles
              const roles = await noblox.getRoles(groupId);
              const role = roles.find(r => r.rank === rank)?.name || `Rank ${rank}`;
              groupInfo.push({
                groupName: groupData.name,
                robloxRank: role
              });
              console.log(`User ${robloxUsername} in group ${groupData.name} (ID: ${groupId}) with role ${role}`);
            } else {
              groupInfo.push({
                groupName: groupData.name,
                robloxRank: 'Non-Group Member'
              });
              console.log(`User ${robloxUsername} not in group ${groupData.name} (ID: ${groupId})`);
            }
          } catch (error) {
            console.error(`Error checking group ${groupId} for ${robloxUsername}:`, error);
            groupInfo.push({
              groupName: `Group ID: ${groupId}`,
              robloxRank: 'Non-Group Member'
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching Roblox group data for ${robloxUsername}:`, error);
        groupInfo.push({ groupName: 'Error', robloxRank: 'Unable to fetch group data' });
      }

      // Build the embed for offenses, gun licenses, and group info
      const embed = new EmbedBuilder()
        .setTitle(`Records for ${robloxUsername}`)
        .setColor('#808080') // Gray color
        .addFields(
          { name: 'Gun Licenses', value: gunLicenses, inline: false }
        );

      // Set the thumbnail if a valid profile picture exists
      if (profilePicture) {
        embed.setThumbnail(profilePicture);
      }

      // Add group info to the embed
      if (groupInfo.length > 0) {
        const groupFields = groupInfo.map(group => 
          `**${group.groupName}**: ${group.robloxRank}`
        ).join('\n');
        embed.addFields(
          { name: 'Roblox Groups', value: groupFields || 'No group memberships found.', inline: false }
        );
      }

      // Add a separation text between the group section and offenses
      embed.addFields({
        name: 'Records',
        value: '__________', // Text separator
        inline: false,
      });

      // Add offenses to the embed
      if (offenses.length > 0) {
        offenses.forEach(offense => {
          embed.addFields({
            name: `Case ID: ${offense.caseId}`,
            value: `**Offense:** ${offense.offense}\n**Details:** ${offense.details}\n**Punishment:** ${offense.punishment}\n**Filed By:** ${offense.officer}\n**Officers Involved:** ${offense.discordUserIds ? offense.discordUserIds.split(',').map(id => `<@${id}>`).join(', ') : 'N/A'}\n**Date Filed:** ${offense.date.toDateString()}`,
            inline: false,
          });
        });
      } else {
        embed.addFields({ name: 'Offenses', value: 'No offenses found.', inline: false });
      }

      // Send the embed
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching records:', error);
      await interaction.reply({
        content: 'An error occurred while fetching the records. Please try again later.',
        ephemeral: true,
      });
    }
  },
};