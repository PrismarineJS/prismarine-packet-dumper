// Logic for mineflayer bot to generate packets with
const mineflayer = require('mineflayer')
const { once } = require('events')
const wait = ms => new Promise((resolve, reject) => setTimeout(resolve, ms))
// triggers to make packets
const triggers = [triggerNamedEntitySpawn, triggerTabComplete, triggerChat, triggerRespawn, triggerGameStateChange, triggerSetCooldown]

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
  const p = once(botOne, 'end')
  botOne.end()
  await p
}

async function triggerTabComplete (server, bot) {
  const p = once(bot._client, 'tab_complete')
  await bot.tabComplete('/weather ')
  await p
}

async function triggerChat (server, bot) {
  const p = once(bot, 'message')
  await bot.chat('hi')
  await p
}

async function triggerRespawn (server, bot) {
  const p = once(bot._client, 'respawn')
  await bot.chat(`/kill ${bot.username}`)
  await p
}

async function triggerGameStateChange (server, bot) {
  const p1 = once(bot._client, 'game_state_change')
  bot.chat('/weather rain')
  await p1
  bot.chat('/weather clear')
}

async function triggerSetCooldown (server, bot) {
  bot.chat('/gamemode survival')
  const pearlRecieved = once(bot, 'updateSlot')
  server.writeServer(`give ${bot.username} ender_pearl\n`)
  await pearlRecieved
  const setCooldown = once(bot, 'set_cooldown')
  bot.setQuickBarSlot(36 - bot.inventory.slots.find(x => x.name === 'Ender Pearl').slot)
  bot.activateItem()
  await setCooldown
  bot.chat('/gamemode creative')
}

module.exports = generatePackets
