const fs = require('fs');
const fsP = fs.promises;
const { Direction, prettyPrintBuffer, fullInspect } = require('../lib/common.js');
const PacketVerifier = require('../lib/packet-verifier');

!async function main() {
  let version = process.argv[2];
  if (!version) {
    console.error('minecraft version must be specified!');
    return;
  }

  let verifier = new PacketVerifier({
    version,
    log: Boolean(process.env.LOG_ALL_PACKETS)
  });
  let doVerify = (packet, id, direction) => {
    let result;
    try {
      result = verifier.verify(packet, direction);
    } catch (err) {
      console.error(`id ${id} failed to parse:`, err);
      return;
    }
    let [success, parsed, reserialized] = result;
    if (!success) {
      if (!parsed) {
        console.error(`id ${id} unrecognized packet`);
      } else {
        console.error([
          `id ${id} serialized packet did not match original packet!`,
          `  parsed ${fullInspect(parsed)}`,
          `  expected ${prettyPrintBuffer(packet)}`,
          `  got ${prettyPrintBuffer(reserialized)}`
        ].join('\n'));
      }
    }
  };

  let files = await Promise.all([
    fsP.readdir('packets/from-server'),
    fsP.readdir('packets/from-client')
  ]);
  for (let filename of files[0]) {
    doVerify(await fsP.readFile('packets/from-server/' + filename), +filename, Direction.ServerToClient);
  }
  for (let filename of files[1]) {
    doVerify(await fsP.readFile('packets/from-client/' + filename), +filename, Direction.ClientToServer);
  }
  console.log('done');
}();
