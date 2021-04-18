// Logic for mineflayer bot to generate packets with
const mineflayer = require('mineflayer')
const wtf = require('wtfnode')
const { once } = require('events')
const wait = ms => new Promise((resolve, reject) => setTimeout(resolve, ms))
// triggers to make packets
const triggers = [triggerNamedEntitySpawn, triggerTabComplete]

async function runTests (server, bot) {
  for (const trigger of triggers) {
    await Promise.race([
      trigger(server, bot),
      wait(10000)
    ])
  }
}

async function generatePackets (server, bot) {
  await once(bot, 'spawn')
  console.log('bot connected')
  server.writeServer(`op ${bot.username}\n`) // allow bot to get murdered by a zombie or something
  server.writeServer('time set night\n') // allow bot to get murdered by a zombie or something
  await runTests(server, bot)
  await new Promise((resolve, reject) => setTimeout(resolve, 60 * 1000))
}

async function triggerNamedEntitySpawn (server, bot) {
  const botOne = mineflayer.createBot({ username: 'tempBot' })
  await once(bot._client, 'named_entity_spawn')
  botOne.end()
  await once(botOne, 'end')
  setTimeout(() => {
    wtf.dump()
  }, 1000)
}

async function triggerTabComplete (server, bot) {
  const p = once(bot._client, 'tab_complete')
  await bot.tabComplete('/weather ')
  await p
}

module.exports = generatePackets
