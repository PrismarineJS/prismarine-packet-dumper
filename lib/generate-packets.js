// Logic for mineflayer bot to generate packets with
const mineflayer = require('mineflayer')
const { once } = require('events')
const wait = ms => new Promise((resolve, reject) => setTimeout(resolve, ms))
const mcData = require('minecraft-data')
// triggers to make packets
const triggers = [
  triggerNamedEntitySpawn,
  triggerTabComplete,
  triggerChat,
  triggerRespawn,
  triggerGameStateChange,
  triggerSetCooldown,
  triggerMap,
  triggerTitle,
  triggerScoreboard,
  triggerCollect
]

async function runTests (server, bot) {
  for (const trigger of triggers) {
    await Promise.race([
      trigger(server, bot, mcData(bot.version)),
      wait(10000)
    ])
  }
}

async function generatePackets (server, bot, mcData) {
  await once(bot, 'spawn')
  console.log('bot connected')
  server.writeServer(`op ${bot.username}\n`) // allow bot to get murdered by a zombie or something
  server.writeServer('time set night\n') // allow bot to get murdered by a zombie or something
  await runTests(server, bot)
  await new Promise((resolve, reject) => setTimeout(resolve, 60 * 1000))
}

async function triggerNamedEntitySpawn (server, bot, mcData) {
  const botOne = mineflayer.createBot({ username: 'tempBot' })
  await once(bot._client, 'named_entity_spawn')
  const p = once(botOne, 'end')
  botOne.end()
  await p
}

async function triggerTabComplete (server, bot, mcData) {
  const p = once(bot._client, 'tab_complete')
  await bot.tabComplete('/weather ')
  await p
}

async function triggerChat (server, bot, mcData) {
  const p = once(bot, 'message')
  await bot.chat('hi')
  await p
}

async function triggerRespawn (server, bot, mcData) {
  const p = once(bot._client, 'respawn')
  await bot.chat(`/kill ${bot.username}`)
  await p
}

async function triggerGameStateChange (server, bot, mcData) {
  const p1 = once(bot._client, 'game_state_change')
  bot.chat('/weather rain')
  await p1
  bot.chat('/weather clear')
}

async function triggerSetCooldown (server, bot, mcData) {
  bot.chat('/gamemode survival')
  const pearlRecieved = once(bot.inventory, 'updateSlot')
  console.log('sending give')
  server.writeServer(`give ${bot.username} ender_pearl\n`)
  await pearlRecieved
  const setCooldown = once(bot, 'set_cooldown')
  bot.setQuickBarSlot(36 - bot.inventory.slots.find(x => x?.name === 'ender_pearl').slot)
  bot.activateItem()
  await setCooldown
  bot.chat('/gamemode creative')
}
async function triggerTitle (server, bot, mcData) {
  const commands = [
    '/title @a title {"text":"Your Text","color":"dark_red"}', // 1.16
    '/title @a title {"text":"Your Text","color":"dark_red"}', // 1.14 - 1.15
    '/title @a title {"text":"Your Text","color":"dark_red"}' // 1.8 - 1.12
  ]
  console.log('sending title')
  const wantedCommand = mcData.isNewerOrEqualTo('1.16') ? commands[0] : mcData.isNewerOrEqualTo('1.14') ? commands[1] : mcData.isNewerOrEqualTo('1.8') ? commands[2] : null

  const title = once(bot, 'title')
  bot.chat(wantedCommand)
  await title
}

async function triggerMap (server, bot, mcData) {
  bot.chat('/gamemode survival')
  const mapRecieved = once(bot.inventory, 'updateSlot')
  server.writeServer(`give ${bot.username} map\n`)
  await mapRecieved
  const map = once(bot, 'map')
  bot.setQuickBarSlot(36 - bot.inventory.slots.find(x => x?.name === 'map').slot)
  bot.activateItem()
  await map
  bot.chat('/gamemode creative')
}

async function triggerScoreboard (server, bot, mcData) {
  const displayObjective = once(bot, 'scoreboard_display_objective')
  const objective = once(bot, 'scoreboard_objective')
  const score = once(bot, 'scoreboard_score')
  bot.chat('/scoreboard objectives add Deaths deathCount')
  bot.chat('/scoreboard objectives setdisplay list Deaths')
  bot.chat(`/kill ${bot.username}`) // update score
  await Promise.all([displayObjective, objective, score])
}

async function triggerCollect (server, bot, mcData) {
  const commands = [
    '/give @a stone 1 0', //1.12
    '/give @a stone 1', //1.13+
  ]
  const wantedCommand = mcData.isNewerOrEqualTo('1.13') ? commands[1] : mcData.isNewerOrEqualTo('1.8') ? commands[0] : null
  const collect = once(bot, 'collect')
  bot.chat(wantedCommand)
  await collect
}

module.exports = generatePackets
