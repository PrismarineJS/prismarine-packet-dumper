# prismarine-packet-dumper
[![NPM version](https://img.shields.io/npm/v/prismarine-packet-dumper.svg)](http://npmjs.com/package/prismarine-packet-dumper)
[![Build Status](https://github.com/PrismarineJS/prismarine-packet-dumper/workflows/CI/badge.svg)](https://github.com/PrismarineJS/prismarine-packet-dumper/actions?query=workflow%3A%22CI%22)
[![Discord](https://img.shields.io/badge/chat-on%20discord-brightgreen.svg)](https://discord.gg/GsEFRM8)
[![Gitter](https://img.shields.io/badge/chat-on%20gitter-brightgreen.svg)](https://gitter.im/PrismarineJS/general)
[![Irc](https://img.shields.io/badge/chat-on%20irc-brightgreen.svg)](https://irc.gitter.im/)

[![Try it on gitpod](https://img.shields.io/badge/try-on%20gitpod-brightgreen.svg)](https://gitpod.io/#https://github.com/PrismarineJS/prismarine-packet-dumper)

Dump minecraft packets

## Usage

```sh
node bin/generateLogs.js 1.16.1
node bin/verifyPackets.js 1.16.1
```

```js
const { MineflayerLog, PacketVerifier, Direction } = require('prismarine-packet-dumper');
const fsP = require('fs').promises;

let packetLogger = new MineflayerLog({ version: '1.16.1', outputDirectory: 'packets' });
packetLogger.start('localhost', 25565);

// then, later:
let verifier = new PacketVerifier({ version: '1.16.1' });
verifier.verify(await fsP.readFile('packets/from-server/00000000'), Direction.ServerToClient);
```

## API

TODO, for now, see jsdoc
