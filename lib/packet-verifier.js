const parser = require('minecraft-protocol/src/transforms/serializer.js')
const { Direction, fullInspect } = require('./common.js')

/** Verifies packets are serialized and deserialized correctly */
class PacketVerifier {
  /**
   * The constructor
   * @param {object} opts
   * @param {string} opts.version Target minecraft version
   * @param {boolean} [opts.log=false] Enable debug logging for every packet
   */
  constructor (opts) {
    this.opts = Object.assign({
      log: false
    }, opts)
    this.s2cSerializer = parser.createSerializer({
      isServer: true,
      version: this.opts.version,
      state: 'play'
    })
    this.s2cDeserializer = parser.createDeserializer({
      isServer: false,
      version: this.opts.version,
      state: 'play'
    })
    this.c2sSerializer = parser.createSerializer({
      isServer: true,
      version: this.opts.version,
      state: 'play'
    })
    this.c2sDeserializer = parser.createDeserializer({
      isServer: false,
      version: this.opts.version,
      state: 'play'
    })
  }

  /**
   * Ensure a packet serializes and deserializes properly
   * @param {Buffer} packet
   * @param {number} direction
   * @return {[boolean, object, Buffer]} Success, parsed object, reserialized packet
   */
  verify (packet, direction) {
    const deserialized = direction === Direction.ClientToServer
      ? this.c2sDeserializer.parsePacketBuffer(packet)
      : this.s2cDeserializer.parsePacketBuffer(packet)
    if (this.opts.log) {
      console.log(`parsed type ${deserialized.data.name} ${fullInspect(deserialized.data.params)}`)
    }
    if (deserialized.metadata.size !== packet.length) {
      console.log('Chunk size is ' + packet.length + ' but only ' + deserialized.metadata.size + ' was read ; partial packet : ' +
            JSON.stringify(deserialized.data) + '; buffer :' + packet.toString('hex'))
    }
    // unrecognized packet
    if (!deserialized.data.name) return [false, null, null]
    const reserialized = direction === Direction.ClientToServer
      ? this.c2sSerializer.createPacketBuffer(deserialized.data)
      : this.s2cSerializer.createPacketBuffer(deserialized.data)
    return [packet.equals(reserialized), deserialized.data, reserialized]
  }
}

module.exports = PacketVerifier
