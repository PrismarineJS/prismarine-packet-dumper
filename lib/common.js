const util = require('util')

const Direction = {
  ClientToServer: 0,
  ServerToClient: 1
}

/**
 * Pretty print bytes in a buffer
 * @param {Buffer} buf
 * @return {string}
 */
function prettyPrintBuffer (buf) {
  return `<Buffer (${buf.length}) ${buf.toString('hex').match(/.{2}/g).join(' ')}>`
}

/**
 * util.inspect with infinite depth and array length
 * @param {any} obj
 * @return {string}
 */
function fullInspect (obj) {
  return util.inspect(obj, {
    depth: Infinity,
    maxArrayLength: Infinity,
    colors: Boolean(process.env.ENABLE_COLORS)
  })
}

module.exports = {
  Direction,
  prettyPrintBuffer,
  fullInspect
}
