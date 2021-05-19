// Logic for mineflayer bot to generate packets with
const mineflayer = require('mineflayer')
const { once } = require('events')
const wait = ms => new Promise((resolve, reject) => setTimeout(resolve, ms))
const mcData = require('minecraft-data')
const triggers = [ // triggers to make packets
  triggerNamedEntitySpawn,
  triggerTabComplete,
  triggerChat,
  triggerRespawn,
  triggerGameStateChange,
  triggerSetCooldown,
  triggerMap,
  triggerTitle,
  triggerScoreboard,
  triggerSound,
  triggerEffect,
  triggerFurnace
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
  // make sure bot isn't suffocating
  bot.chat('/setblock ~ ~ ~ air')
  bot.chat('/setblock ~ ~1 ~ air')
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
  server.writeServer(`give ${bot.username} ender_pearl\n`)
  await pearlRecieved
  const setCooldown = once(bot._client, 'set_cooldown')
  bot.equip(bot.inventory.slots.find(x => x?.name === 'ender_pearl'), 'hand')
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
  const wantedCommand = mcData.isNewerOrEqualTo('1.16') ? commands[0] : mcData.isNewerOrEqualTo('1.14') ? commands[1] : mcData.isNewerOrEqualTo('1.8') ? commands[2] : null
  const title = once(bot._client, 'title')
  bot.chat(wantedCommand)
  await title
}

async function triggerMap (server, bot, mcData) {
  bot.chat('/gamemode survival')
  const mapRecieved = once(bot.inventory, 'updateSlot')
  server.writeServer(`give ${bot.username} map\n`)
  await mapRecieved
  const map = once(bot._client, 'map')
  bot.equip(bot.inventory.slots.find(x => x?.name === 'map'), 'hand')
  bot.activateItem()
  await map
  bot.chat('/gamemode creative')
}

async function triggerScoreboard (server, bot, mcData) {
  const displayObjective = once(bot, 'scoreboard_display_objective')
  const objective = once(bot._client, 'scoreboard_objective')
  const score = once(bot._client, 'scoreboard_score')
  bot.chat('/scoreboard objectives add Deaths deathCount')
  bot.chat('/scoreboard objectives setdisplay list Deaths')
  bot.chat(`/kill ${bot.username}`) // update score
  await Promise.all([displayObjective, objective, score])
}

async function triggerSound (server, bot, mcData) {
  const command = mcData.isNewerOrEqualTo('1.9') ? '/playsound minecraft:ambient.cave hostile @a' : '/playsound minecraft:ambient.cave @a'
  const sound = once(bot._client, 'named_sound_effect')
  bot.chat(command)
  await sound
}

async function triggerEffect (server, bot, mcData) {
  const effectStart = once(bot._client, 'entity_effect')
  const effectEnd = once(bot._client, 'remove_entity_effect')
  const command = mcData.isNewerOrEqualTo('1.13') ? '/effect give @a minecraft:absorption 1' : '/effect @a absorption 1 1'
  bot.chat(command)
  await Promise.all([effectStart, effectEnd])
}

async function triggerFurnace (server, bot, mcData) {
  //place furnace
  bot.chat('/setblock ~ ~1 ~1 furnace')
  await once(bot.world, 'blockUpdate')
  // get furnace materials
  const itemOne = once(bot.inventory, 'updateSlot')
  const itemTwo = once(bot.inventory, 'updateSlot')
  server.writeServer(`give ${bot.username} coal 32\n`)
  server.writeServer(`give ${bot.username} cactus\n`)
  await Promise.all([itemOne, itemTwo])
  // use furnace
  const block = await bot.findBlock({ matching: mcData.blocksByName.furnace.id })
  const open = once(bot._client, 'open_window')
  const furnace = await bot.openFurnace(block)
  await open
  await furnace.putFuel(mcData.blocksByName.coal.id, null, 32)
  await furnace.putInput(mcData.blocksByName.cactus.id, null, 1)
  await once(bot._client, 'craft_progress_bar')
  furnace.close()
  const close = await once(bot._client, 'close_window')
}

module.exports = generatePackets
