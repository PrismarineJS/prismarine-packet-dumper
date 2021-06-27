// Logic for mineflayer bot to generate packets with
const mineflayer = require('mineflayer')
const { once } = require('events')
const mcData = require('minecraft-data')
const supportsPacket = (mcdata, packetName) => Object.keys(mcdata.protocol.play.toClient.types).includes(packetName)
const debug = require('debug')('prismarine-packet-dumper')
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
  triggerFurnace,
  triggerBossBar,
  triggerPainting,
  triggerStatistics
]

async function runTests (server, bot) {
  for (const trigger of triggers) {
    debug(`[Trigger] ${trigger.name} Started`)
    const res = await Promise.race([
      trigger(server, bot, mcData(bot.version))
      // wait(10000)
    ])

    if (res === 'timeout') {
      debug(`[Trigger] ${trigger.name} Timed Out`)
    } else {
      debug(`[Trigger] ${trigger.name} Done Successfully`)
    }
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
  // await new Promise((resolve, reject) => setTimeout(resolve, 60 * 1000))
}

async function triggerNamedEntitySpawn (server, bot, mcData) {
  if (!supportsPacket(mcData, 'named_entity_spawn')) return
  const botOne = mineflayer.createBot({ username: 'tempBot' })
  await once(bot._client, 'named_entity_spawn')
  botOne.end()
  await once(botOne, 'end')
}

async function triggerTabComplete (server, bot, mcData) {
  if (!supportsPacket(mcData, 'tab_complete')) return
  const p = once(bot._client, 'tab_complete')
  await bot.tabComplete('/weather ')
  await p
}

async function triggerChat (server, bot, mcData) {
  if (!supportsPacket(mcData, 'message')) return
  await bot.chat('hi')
  await once(bot, 'message')
}

async function triggerRespawn (server, bot, mcData) {
  if (!supportsPacket(mcData, 'respawn')) return
  await bot.chat(`/kill ${bot.username}`)
  await once(bot._client, 'respawn')
}

async function triggerGameStateChange (server, bot, mcData) {
  if (!supportsPacket(mcData, 'game_state_change')) return
  bot.chat('/weather rain')
  await once(bot._client, 'game_state_change')
  bot.chat('/weather clear')
}

async function triggerSetCooldown (server, bot, mcData) {
  if (!supportsPacket(mcData, 'set_cooldown')) return
  bot.chat('/gamemode survival')
  server.writeServer(`give ${bot.username} ender_pearl\n`)
  await once(bot.inventory, 'updateSlot')
  console.log('Receieved pearl')
  await bot.equip(mcData.itemsByName.ender_pearl.id, 'hand')
  console.log('equipped pearl')
  bot.activateItem()
  await once(bot._client, 'set_cooldown')
  bot.chat('/gamemode creative')
}
async function triggerTitle (server, bot, mcData) {
  if (!supportsPacket(mcData, 'title')) return
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
  if (!supportsPacket(mcData, 'map')) return
  bot.chat('/gamemode survival')
  const mapRecieved = once(bot.inventory, 'updateSlot')
  server.writeServer(`give ${bot.username} map\n`)
  await mapRecieved
  const map = once(bot._client, 'map')
  bot.equip(mcData.itemsByName.map.id, 'hand')
  bot.activateItem()
  await map
  bot.chat('/gamemode creative')
}

async function triggerScoreboard (server, bot, mcData) {
  if (supportsPacket(mcData, 'scoreboard_display_objective')) {
    bot.chat('/scoreboard objectives add Deaths deathCount')
    await once(bot._client, 'scoreboard_display_objective')
  }
  if (supportsPacket(mcData, 'scoreboard_objective')) {
    bot.chat('/scoreboard objectives setdisplay list Deaths')
    await once(bot._client, 'scoreboard_objective')
  }
  if (supportsPacket(mcData, 'scoreboard_score')) {
    bot.chat(`/kill ${bot.username}`)
    await once(bot._client, 'scoreboard_score') // update score
  }
}

async function triggerSound (server, bot, mcData) {
  if (!supportsPacket(mcData, 'named_sound_effect')) return
  const command = mcData.isNewerOrEqualTo('1.9') ? '/playsound minecraft:ambient.cave hostile @a' : '/playsound minecraft:ambient.cave @a'
  const sound = once(bot._client, 'named_sound_effect')
  bot.chat(command)
  await sound
}

async function triggerEffect (server, bot, mcData) {
  const proms = []
  if (supportsPacket(mcData, 'named_sound_effect')) {
    proms.push(once(bot._client, 'entity_effect'))
  }
  if (supportsPacket(mcData, 'remove_entity_effect')) {
    proms.push(once(bot._client, 'remove_entity_effect'))
  }
  const command = mcData.isNewerOrEqualTo('1.13') ? '/effect give @a minecraft:absorption 1' : '/effect @a absorption 1 1'
  bot.chat(command)
  if (proms.length > 0) await Promise.all(proms)
}

async function triggerFurnace (server, bot, mcData) {
  // if (!supportsPacket(mcData, 'named_sound_effect')) return
  // place furnace
  bot.chat('/setblock ~ ~1 ~1 furnace')
  await once(bot.world, 'blockUpdate')
  // get furnace materials
  server.writeServer(`give ${bot.username} coal 32\n`)
  await once(bot.inventory, 'updateSlot')
  server.writeServer(`give ${bot.username} cactus\n`)
  await once(bot.inventory, 'updateSlot')
  // use furnace
  const block = await bot.findBlock({ matching: mcData.blocksByName.furnace.id })
  const furnace = await bot.openFurnace(block)
  if (supportsPacket(mcData, 'open_window')) {
    await once(bot._client, 'open_window')
  }
  await furnace.putFuel(mcData.itemsByName.coal.id, null, 32)
  await furnace.putInput(mcData.itemsByName.cactus.id, null, 1)
  if (supportsPacket(mcData, 'craft_progress_bar')) {
    await once(bot._client, 'craft_progress_bar')
  }
  // force close furnace
  bot.chat('/setblock ~ ~1 ~1 air')
  if (supportsPacket(mcData, 'close_window')) {
    await once(bot._client, 'close_window')
  }
}

async function triggerBossBar (server, bot, mcData) {
  if (!supportsPacket(mcData, 'boss_bar')) return
  let wantedCmds = ['/summon WitherBoss', '/kill @e[type=WitherBoss]'] // <= 1.10
  if (mcData.isNewerOrEqualTo('1.11')) {
    wantedCmds = ['/summon wither', '/kill @e[type=wither]']
  }
  bot.chat(wantedCmds[0])
  await once(bot._client, 'boss_bar')
  bot.chat(wantedCmds[1])
}

async function triggerPainting (server, bot, mcData) {
  const proms = []
  if (supportsPacket(mcData, 'entity_effect')) {
    proms.push(once(bot._client, 'entity_effect'))
  }
  if (supportsPacket(mcData, 'spawn_entity')) {
    proms.push(once(bot._client, 'spawn_entity'))
  }
  if (supportsPacket(mcData, 'spawn_entity_painting')) {
    proms.push(once(bot._client, 'spawn_entity_painting'))
  }
  const wantedCommand = mcData.isNewerOrEqualTo('1.11') ? '/summon Painting' : '/summon painting ~ ~ ~ {Facing:0,Motive:Kebab}'
  bot.chat(wantedCommand)
  await Promise.all(proms)
}

async function triggerStatistics (server, bot, mcData) {
  if (!supportsPacket(mcData, 'statistics')) return
  bot._client.write('client_command', { actionId: 1 })
  await once(bot._client, 'statistics')
}

module.exports = generatePackets
