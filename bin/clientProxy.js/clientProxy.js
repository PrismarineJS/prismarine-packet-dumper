// This script allows a minecraft client's packets to be dumped to a folder

const { states, createClient, createServer } = require('minecraft-protocol')
const path = require('path')
const fsP = require('fs').promises

const version = process.argv[2]
const host = process.argv[3]
const port = process.argv[4] ?? 25565
const PACKET_DIRECTORY = path.resolve(process.argv[5] ?? 'packets')

if (!process.argv[2] || !process.argv[3]) {
  console.log('Usage: clientProxy.js <version> <host> [port] [packetsFolder]')
  process.exit(1)
}

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

async function start () {
  if (await fileExists(PACKET_DIRECTORY)) {
    console.log('deleting old packet log')
    await fsP.rm(PACKET_DIRECTORY, { recursive: true, force: true })
  }
  await fsP.mkdir(PACKET_DIRECTORY)
  await fsP.mkdir(path.join(PACKET_DIRECTORY, 'from-server'))
  await fsP.mkdir(path.join(PACKET_DIRECTORY, 'from-client'))
}

start()

const srv = createServer({
  'online-mode': false,
  port: 25566,
  keepAlive: false,
  version: version
})
srv.on('login', function (client) {
  const addr = client.socket.remoteAddress
  console.log('Incoming connection', `(${addr})`)
  let endedClient = false
  let endedTargetClient = false
  client.on('end', function () {
    endedClient = true
    console.log('Connection closed by client', `(${addr})`)
    if (!endedTargetClient) { targetClient.end('End') }
  })
  client.on('error', function (err) {
    endedClient = true
    console.log('Connection error by client', `(${addr})`)
    console.log(err.stack)
    if (!endedTargetClient) { targetClient.end('Error') }
  })
  const targetClient = createClient({
    host: host,
    port: port,
    username: client.username,
    keepAlive: false,
    version: version
  })
  const fromServKindCounter = {}
  const fromServKindPromise = {}
  const fromServMaxPerKind = 5
  client.on('packet', async (data, meta, buffer, fullBuffer) => {
    if (version !== '1.7') {
      buffer = fullBuffer
    }
    if (!endedTargetClient) targetClient.write(meta.name, data)
    if (!(meta.state === states.PLAY && client.state === states.PLAY)) return
    if (fromServKindCounter[meta.name] === undefined) {
      fromServKindCounter[meta.name] = 0
      fromServKindPromise[meta.name] = fsP.mkdir(path.join(PACKET_DIRECTORY, 'from-server', meta.name))
    }
    if (fromServKindCounter[meta.name] >= fromServMaxPerKind) {
      return
    }
    fromServKindCounter[meta.name] += 1
    const n = fromServKindCounter[meta.name]

    await fromServKindPromise[meta.name]
    await fsP.writeFile(path.join(PACKET_DIRECTORY, 'from-server', meta.name, '' + n + '.raw'), buffer)
    await fsP.writeFile(path.join(PACKET_DIRECTORY, 'from-server', meta.name, '' + n + '.json'), JSON.stringify(data, null, 2))
  })
  const toServKindCounter = {}
  const toServKindPromise = {}
  const toServMaxPerKind = 5
  targetClient.on('packet', async (data, meta, buffer, fullBuffer) => {
    if (version !== '1.7') {
      buffer = fullBuffer
    }
    if (meta.state === states.PLAY && client.state === states.PLAY) {
      if (!endedClient) {
        client.write(meta.name, data)
        if (meta.name === 'set_compression') {
          client.compressionThreshold = data.threshold
        } // Set compression
      }

      if (toServKindCounter[meta.name] === undefined) {
        toServKindCounter[meta.name] = 0
        toServKindPromise[meta.name] = fsP.mkdir(path.join(PACKET_DIRECTORY, 'from-client', meta.name))
      }
      if (toServKindCounter[meta.name] >= toServMaxPerKind) return

      toServKindCounter[meta.name] += 1
      const n = toServKindCounter[meta.name]

      await toServKindPromise[meta.name]
      await fsP.writeFile(path.join(PACKET_DIRECTORY, 'from-client', meta.name, `${n}.raw`), buffer)
      await fsP.writeFile(path.join(PACKET_DIRECTORY, 'from-client', meta.name, `${n}.json`), JSON.stringify(data, null, 2))
    }
  })
  targetClient.on('end', function () {
    endedTargetClient = true
    console.log('Connection closed by server', `(${addr})`)
    if (!endedClient) client.end('End')
  })
  targetClient.on('error', function (err) {
    endedTargetClient = true
    console.log('Connection error by server', `(${addr})`, err)
    console.log(err.stack)
    if (!endedClient) client.end('Error')
  })
})
