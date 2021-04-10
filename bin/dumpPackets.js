#!/usr/bin/env node
const minecraftWrap = require('minecraft-wrap')
const fs = require('fs')
const fsP = fs.promises
const path = require('path')
const util = require('util')
const MineflayerLog = require('../lib/mineflayer-log')
const { makeMarkdown, parsePacketCounter } = require('../lib/stats-helper')

const argv = require('yargs/yargs')(process.argv.slice(2))
  .usage('Usage: $0 [options]')
  .version(false) // disable default version command
  .option('version', {
    alias: ['v', 'ver'],
    description: 'The mc version to dump',
    string: true,
    demandOption: true
  })
  .option('outputFolder', {
    alias: ['o', 'output'],
    description: 'Where to save the dumped packets',
    default: 'output',
    string: true,
    coerce: path.resolve
  })
  .option('h', {
    alias: 'help',
    description: 'Display help message'
  })
  .option('dryrun', {
    alias: 'd',
    default: false,
    boolean: true,
    description: "Run dumper but don't save packets"
  })
  .option('mdStatsSaveDir', {
    string: true,
    default: '.',
    description: 'Where to save statistics file',
    coerce: path.resolve
  })
  .option('jsonStatsSaveDir', {
    string: true,
    default: '.',
    description: 'Where to save statistics file',
    coerce: path.resolve
  })
  .help('help')
  // show examples of application in action.
  // final message to display when successful.
  .epilog('for more information visit https://discord.gg/tWaPBNtkaq')
  // disable showing help on failures, provide a final message
  // to display for errors.
  .showHelpOnFail(false, 'whoops, something went wrong! get more info with --help')
  .argv

const SERVER_DIRECTORY = path.resolve('temp')
const SERVER_PATH = path.join(SERVER_DIRECTORY, 'server.jar')
const PACKET_DIRECTORY = argv.outputFolder

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

async function deleteIfExists (path) {
  if (!await fileExists(path)) return
  await fsP.rm(path, { recursive: true, force: true })
}

async function setupDirectories () {
  console.log('deleting old packets & metadata')
  await deleteIfExists(PACKET_DIRECTORY)
  await deleteIfExists(path.resolve('packets_info.json'))
  await deleteIfExists(path.resolve('README.md'))

  await fsP.mkdir(PACKET_DIRECTORY)
  await fsP.mkdir(path.join(PACKET_DIRECTORY, 'from-server'))
  await fsP.mkdir(path.join(PACKET_DIRECTORY, 'from-client'))
}

async function downloadMCServer (version) {
  await deleteIfExists(SERVER_DIRECTORY)
  console.log('downloading server')
  await downloadServer(version, SERVER_PATH)
  console.log('done')
}

async function startServer () {
  console.log('starting server')
  const server = new minecraftWrap.WrapServer(SERVER_PATH, SERVER_DIRECTORY, {
    maxMem: 2048
  })

  server.on('line', line => console.log(`server: ${line}`))
  await util.promisify(server.startServer.bind(server))({
    'online-mode': false,
    difficulty: 'normal',
    'spawn-protection': 'off'
  })
  console.log('server started')
  return server
}

async function startMineflayer (version) {
  const packetLogger = new MineflayerLog({ version, outputDirectory: PACKET_DIRECTORY, dryRun: argv.dryrun })
  packetLogger.start('localhost', 25565)
  return packetLogger
}

async function cleanup () {
  await fsP.rm(SERVER_DIRECTORY, { recursive: true, force: true })
  await fsP.rm(path.resolve('versions'), { recursive: true, force: true })
  await fsP.rm(path.resolve('launcher_accounts.json'), { force: true })
}

async function makeStats (packetLogger, version) {
  const { collectedPackets, allPackets } = parsePacketCounter(version, packetLogger.kindCounter)
  // write packet data
  const data = {
    collected: collectedPackets,
    missing: allPackets.filter(o => !collectedPackets.includes(o))
  }

  await fsP.writeFile(path.join(argv.outputFolder, 'packets_info.json'), JSON.stringify(data, null, 2))
  await fsP.writeFile(path.join(argv.outputFolder, 'README.md'), makeMarkdown(data))
}

function asyncStopServer (server) {
  return new Promise((resolve, reject) => server.stopServer(resolve))
}

// Logic for mineflayer bot to generate packets with
async function generatePackets (server, bot) {
  bot.once('spawn', () => {
    console.log('bot connected')
    server.writeServer('time set night\n') // allow bot to get murdered by a zombie or something
  })
  await new Promise((resolve, reject) => setTimeout(resolve, 10 * 1000)) // wait a minute to get packets
}

async function main () {
  // setup
  const version = argv.version
  await downloadMCServer(version) // download server
  await setupDirectories() // delete old directories
  // start client/server
  const server = await startServer() // start server
  const packetLogger = await startMineflayer(version) // start mineflayer
  // generate packets
  const { bot } = packetLogger
  await generatePackets(server, bot)
  // stop client/server
  bot.quit()
  await asyncStopServer(server)
  // make stats files
  await makeStats(packetLogger, version)
  // delete temp files
  await cleanup()
}

main()
