const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

async function pagination(interaction, pages) {
  let currentPage = 0;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('Previous')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('Next')
      .setStyle(ButtonStyle.Primary)
  );

  const message = await interaction.reply({
    embeds: [pages[currentPage]],
    components: [row],
    fetchReply: true,
  });

  const collector = message.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id,
    time: 60000,
  });

  collector.on('collect', async i => {
    if (i.customId === 'prev') {
      currentPage = Math.max(currentPage - 1, 0);
    } else if (i.customId === 'next') {
      currentPage = Math.min(currentPage + 1, pages.length - 1);
    }

    await i.update({
      embeds: [pages[currentPage]],
      components: [
        row.setComponents(
          row.components[0].setDisabled(currentPage === 0),
          row.components[1].setDisabled(currentPage === pages.length - 1)
        ),
      ],
    });
  });

  collector.on('end', () => {
    row.components.forEach(button => button.setDisabled(true));
    message.edit({ components: [row] });
  });
}

module.exports = pagination;
