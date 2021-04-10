#!/usr/bin/env node

const path = require('path')
const fs = require('fs')
const fsP = fs.promises
const util = require('util')
const minecraftWrap = require('minecraft-wrap')
const MineflayerLog = require('../lib/mineflayer-log')

const SERVER_DIRECTORY = path.resolve('server')
const SERVER_PATH = path.join(SERVER_DIRECTORY, 'server.jar')
const PACKET_DIRECTORY = path.resolve('packets')

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

  if (await fileExists(PACKET_DIRECTORY)) {
    console.log('deleting old packet log')
    await fsP.rm(PACKET_DIRECTORY, { recursive: true, force: true })
  }
  await fsP.mkdir(PACKET_DIRECTORY)
  await fsP.mkdir(path.join(PACKET_DIRECTORY, 'from-server'))
  await fsP.mkdir(path.join(PACKET_DIRECTORY, 'from-client'))

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
  const packetLogger = new MineflayerLog({ version, outputDirectory: PACKET_DIRECTORY })
  packetLogger.start('localhost', 25565)
  packetLogger.bot.on('spawn', () => {
    console.log('bot connected')
    server.writeServer('time set night\n') // allow bot to get murdered by a zombie or something
  })
  setTimeout(() => {
    packetLogger.bot.quit()
    server.stopServer(() => process.exit(0))
  }, 60 * 1000)
}())
