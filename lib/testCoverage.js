/**
 * This file is to see what packets were collected, and which were not
 */

const path = require('path')
const fs = require('fs')
const fsP = fs.promises
const util = require('util')
const minecraftWrap = require('minecraft-wrap')
const MineflayerLog = require('../lib/mineflayer-log')

const SERVER_DIRECTORY = path.resolve('server')
const SERVER_PATH = path.join(SERVER_DIRECTORY, 'server.jar')

const downloadServer = util.promisify(minecraftWrap.download)

/**
 * Stat stuff to see if it exists
 * @param {string} path
 */
async function fileExists (path) {
  try {
    await fsP.stat(path)
    return true
  } catch (err) {
    return false
  }
}

(async function main () {
  const version = process.argv[2]
  if (!version) {
    console.error('version needed as first argument!')
    process.exit(1)
  }
  if (!await fileExists(SERVER_DIRECTORY)) await fsP.mkdir(SERVER_DIRECTORY)
  console.log('downloading server')
  await downloadServer(version, SERVER_PATH)
  console.log('done')

  console.log('starting server')
  const server = new minecraftWrap.WrapServer(SERVER_PATH, SERVER_DIRECTORY, {
    maxMem: 2048
  })
  server.on('line', line => console.log('server:', line))
  await util.promisify(server.startServer.bind(server))({
    'online-mode': false,
    difficulty: 'normal',
    'spawn-protection': 'off'
  })
  console.log('server started')
  const packetLogger = new MineflayerLog({ version, dryRun: true })
  packetLogger.start('localhost', 25565)
  packetLogger.bot.on('spawn', () => {
    console.log('bot connected')
    server.writeServer('time set night\n') // allow bot to get murdered by a zombie or something
  })
  setTimeout(() => {
    const mcData = require('minecraft-data')(packetLogger.bot.version)
    packetLogger.bot.quit()

    // record packets
    const collectedPackets = Object.keys(packetLogger.kindCounter)
    const allPackets = Object.keys(mcData.protocol.play.toClient.types)
      .filter(o => o.startsWith('packet_'))
      .map(o => o.replace('packet_', ''))

    // write packet data
    const data = {
      collected: collectedPackets,
      missing: allPackets.filter(o => !collectedPackets.includes(o))
    }

    fs.writeFileSync('packets_info.json', JSON.stringify(data, null, 2))
    server.stopServer(() => process.exit(0))
  }, 20 * 1000)
}())
