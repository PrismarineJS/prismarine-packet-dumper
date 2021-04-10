// Logic for mineflayer bot to generate packets with
async function generatePackets (server, bot) {
  bot.once('spawn', () => {
    console.log('bot connected')
    server.writeServer('time set night\n') // allow bot to get murdered by a zombie or something
  })
  await new Promise((resolve, reject) => setTimeout(resolve, 60 * 1000)) // wait a minute to get packets
}

module.exports = generatePackets
