const fs = require('fs');
const fsP = fs.promises;
const path = require('path');
const mineflayer = require('mineflayer');

const NUMBER_LENGTH = 8; // 100 million packets should be enough

/** Packet logger using mineflayer */
class MineflayerLog {
  /**
   * The constructor
   * @param {object} opts
   * @param {string} opts.version Target minecraft version
   * @param {string} opts.outputDirectory Directory to write packets to
   */
  constructor(opts) {
    this.version = opts.version;
    this.outputDirectory = opts.outputDirectory;
    this.packetIndex = 0;
    this.bot = null;
  }

  start(host, port, username = 'nmptestbot') {
    this.bot = mineflayer.createBot({
      host,
      port,
      username,
      version: this.version
    });
    this.setupPacketLog(this.bot._client);
  }

  setupPacketLog(client) {
    client.on('raw', async (buffer, meta) => {
      if (meta.state !== 'play') return;
      let formattedNumber = this.packetIndex.toString().padStart(NUMBER_LENGTH, '0');
      this.packetIndex++;
      await fsP.writeFile(path.join(this.outputDirectory, 'from-server', formattedNumber), buffer);
    });
  }
}

module.exports = MineflayerLog;
