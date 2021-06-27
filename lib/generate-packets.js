// Logic for mineflayer bot to generate packets with
const mineflayer = require('mineflayer')
const { once } = require('events')
const unversionedMcData = require('minecraft-data')
const supportsPacket = (mcdata, packetName) => Object.keys(mcdata.protocol.play.toClient.types).filter(o => o.startsWith('packet')).map(o => o.replace('packet_', '')).includes(packetName)

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
  // triggerPainting,
  triggerStatistics
]

async function runTests (server, bot) {
  const mcData = unversionedMcData(bot.version)

  bot.giveItem = async (item, count = 1) => {
    console.log('Running: ' + `give ${bot.username} ${item.name}${count && +count !== 1 ? ` ${count}` : ''}\n`)
    server.writeServer(`give ${bot.username} ${item.name}${count && +count !== 1 ? ` ${count}` : ''}\n`)
    if (mcData.isNewerOrEqualTo('1.13')) {
      await bot.awaitMessage(new RegExp(`Gave ${count} \\[${item.displayName}\\] to ${bot.username}`))
    } else {
      await bot.awaitMessage(new RegExp(`Given \\[${item.displayName}\\] \\* ${count} to ${bot.username}`))
    }
  }

  for (const trigger of triggers) {
    debug(`[Trigger] ${trigger.name} Started`)
    await trigger(server, bot, unversionedMcData(bot.version))
    debug(`[Trigger] ${trigger.name} Done Successfully`)
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
  await bot.giveItem(mcData.itemsByName.ender_pearl, 1)
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
  await bot.giveItem(mcData.itemsByName.map, 1)
  bot.equip(mcData.itemsByName.map.id, 'hand')
  bot.activateItem()
  await once(bot._client, 'map')
  bot.chat('/gamemode creative')
}

async function triggerScoreboard (server, bot, mcData) {
  const proms = []
  if (supportsPacket(mcData, 'scoreboard_display_objective')) {
    bot.chat('/scoreboard objectives add Deaths deathCount')
    proms.push(once(bot._client, 'scoreboard_display_objective'))
  }
  if (supportsPacket(mcData, 'scoreboard_objective')) {
    bot.chat('/scoreboard objectives setdisplay sidebar Deaths')
    proms.push(once(bot._client, 'scoreboard_objective'))
  }
  if (supportsPacket(mcData, 'scoreboard_score')) {
    bot.chat(`/kill ${bot.username}`)
    proms.push(once(bot._client, 'scoreboard_score')) // update score
  }

  if (proms.length > 0) await Promise.all(proms)
}

async function triggerSound (server, bot, mcData) {
  if (!supportsPacket(mcData, 'named_sound_effect')) return
  const command = mcData.isNewerOrEqualTo('1.9') ? '/playsound minecraft:ambient.cave hostile @a' : '/playsound minecraft:ambient.cave @a'
  bot.chat(command)
  await once(bot._client, 'named_sound_effect')
}

async function triggerEffect (server, bot, mcData) {
  const proms = []
  if (supportsPacket(mcData, 'entity_effect')) {
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
  // place furnace
  bot.chat('/setblock ~ ~1 ~1 furnace')
  await once(bot.world, 'blockUpdate')
  // get furnace materials
  await bot.giveItem(mcData.itemsByName.coal, 32)
  await bot.giveItem(mcData.itemsByName.cactus, 1)
  // use furnace
  const block = await bot.findBlock({ matching: mcData.blocksByName.furnace.id })
  if (!block) throw new Error('Could not find a furnace block for furnace trigger')
  let furnace
  console.log('opening furnace')
  if (supportsPacket(mcData, 'open_window')) {
    const p = once(bot._client, 'open_window')
    furnace = await bot.openFurnace(block)
    console.log('opened furnace')
    await p
  } else {
    furnace = await bot.openFurnace(block)
  }
  console.log('ready to use furnace')
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
  if (mcData.isNewerOrEqualTo('1.11')) {
    bot.chat('/setblock ~ ~ ~1 stone')
    bot.chat('/kill @a[type=!player]')
    bot.chat('/summon Painting ~ ~1 ~1')
  } else {
    bot.chat('/summon painting ~ ~ ~ {Facing:0,Motive:Kebab}')
  }
  if (proms.length > 0) await Promise.all(proms)
}

async function triggerStatistics (server, bot, mcData) {
  if (!supportsPacket(mcData, 'statistics')) return
  if (mcData.isNewerOrEqualTo('1.9')) {
    bot._client.write('client_command', { actionId: 1 })
  } else {
    bot._client.write('client_command', { payload: 1 })
  }
  await once(bot._client, 'statistics')
}

module.exports = generatePackets
