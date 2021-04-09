#!/usr/bin/env node
const minecraftWrap = require('minecraft-wrap')
const fs = require('fs')
const fsP = fs.promises
const path = require('path')
const util = require('util')
const MineflayerLog = require('../lib/mineflayer-log')
const rimraf = util.promisify(require('rimraf'))

const argv = require('yargs/yargs')(process.argv.slice(2))
  .usage('Usage: $0 [options]')
  .version(false) // disable default version command
  .option('version', {
    alias: ['v', 'ver'],
    description: 'The mc version to dump',
    string: true,
    demandOption: true
  })
  .option('packetsSaveDir', {
    description: 'Where to save the dumped packets',
    default: 'packets',
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
    description: "Run dumper but don't save packets",
    implies: 'saveStatistics'
  })
  .option('saveStatistics', {
    alias: ['s', 'stats'],
    description: 'Save statistics generated?',
    boolean: true,
    default: false,
    implies: 'statsFormat'
  })
  .option('statsFormat', {
    description: 'File format for stats',
    choices: ['md', 'json', 'both'],
    requiresArg: 'saveStatistics'
  })
  .option('mdStatsSaveDir', {
    string: true,
    default: '.',
    description: 'Where to save statistics file',
    requiresArg: 'saveStatistics',
    coerce: path.resolve
  })
  .option('jsonStatsSaveDir', {
    string: true,
    default: '.',
    description: 'Where to save statistics file',
    requiresArg: 'saveStatistics',
    coerce: path.resolve
  })
  .option('serverDirectory', {
    alias: 'servDir',
    description: 'Where the dumper stores the server.jar',
    default: 'server',
    coerce: path.resolve
  })
  .option('delTempFiles', {
    alias: 't',
    description: 'delete "server/", "versions/", "launcher_profiles.json"',
    default: false,
    boolean: true
  })
  .help('help')
  // show examples of application in action.
  // final message to display when successful.
  .epilog('for more information visit https://discord.gg/tWaPBNtkaq')
  // disable showing help on failures, provide a final message
  // to display for errors.
  .showHelpOnFail(false, 'whoops, something went wrong! get more info with --help')
  .argv

const SERVER_DIRECTORY = argv.serverDirectory
const SERVER_PATH = path.join(SERVER_DIRECTORY, 'server.jar')
const PACKET_DIRECTORY = argv.packetsSaveDir

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
  const version = argv.version
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
    await rimraf(PACKET_DIRECTORY)
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
  const packetLogger = new MineflayerLog({ version, outputDirectory: PACKET_DIRECTORY, dryRun: argv.dryrun })
  packetLogger.start('localhost', 25565)
  packetLogger.bot.on('spawn', () => {
    console.log('bot connected')
    server.writeServer('time set night\n') // allow bot to get murdered by a zombie or something
  })
  setTimeout(() => {
    const mcData = require('minecraft-data')(packetLogger.bot.version)
    packetLogger.bot.quit()
    server.stopServer(() => process.exit(0))

    if (argv.saveStatistics) {
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
      if (argv.statsFormat === 'both') {
        fs.writeFileSync(path.join(argv.mdStatsSaveDir, 'README.md'), makeMarkdown(data, version))
        fs.writeFileSync(path.join(argv.jsonStatsSaveDir, 'packets_info.json'), JSON.stringify(data, null, 2))
      } else if (argv.statsFormat === 'md') {
        fs.writeFileSync(path.join(argv.mdStatsSaveDir, 'README.md'), makeMarkdown(data, version))
      } else if (argv.statsFormat === 'json') {
        fs.writeFileSync(path.join(argv.jsonStatsSaveDir, 'packets_info.json'), JSON.stringify(data, null, 2))
      }
    }

    if (argv.delTempFiles) {
      await fsP.rm(SERVER_DIRECTORY, { recursive: true, force: true })
      await fsP.rm(path.resolve('versions'), { recursive: true, force: true })
      await fsP.rm(path.resolve('launcher_profiles.json'), { recursive: true, force: true })
    }
  }, 60 * 1000)
}())

const makeDropdownStart = (name, arr) => {
  arr.push(`<details><summary>${name}</summary>`)
  arr.push('<p>')
  arr.push('')
}
const makeDropdownEnd = (arr) => {
  arr.push('')
  arr.push('</p>')
  arr.push('</details>')
}

function makeMarkdown (data, version) {
  const str = []
  const { collected, missing } = data

  makeDropdownStart(`Collected (${collected.length})`, str)
  str.push('| Packet |')
  str.push('| --- |')
  collected.forEach(elem => {
    str.push(`| ${elem} |`)
  })
  makeDropdownEnd(str)

  makeDropdownStart(`Missing (${missing.length})`, str)
  str.push('| Packet |')
  str.push('| --- |')
  missing.forEach(elem => {
    str.push(`| ${elem} |`)
  })
  makeDropdownEnd(str)

  return str.join('\n')
}
