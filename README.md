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

## Manually dump packets

In order to dump packets from the vanilla client, there is a script called [clientProxy](bin/clientProxy.js)

In order to use, you run it with the server ip you would want to connect to, then connect with your client to `localhost:25566`

If you would like to use this without cloning from github, you can install it globally by following this guide:

### Global install

`$ npm i -g prismarine-packet-dumper`

`$ clientProxy <mc_version> <server_ip> [port] [packets_folder]`

## API

### For [`bin/dumpPackets.js`](bin/dumpPackets.js)

```
$ node dumpPackets.js  --help
Usage: dumpPackets.js [options]

Options:
  -v, --version, --ver          The mc version to dump       [string] [required]
  -o, --outputFolder, --output  Where to save the dumped packets
                                                    [string] [default: "output"]
  -h, --help                    Show help                              [boolean]
  -d, --dryrun                  Run dumper but only save stats files
                                                      [boolean] [default: false]

for more information visit https://discord.gg/tWaPBNtkaq
```

### For [`bin/metricAggregator.js`](bin/metricAggregator.js)

Used to generate global packet stats, like the ones commented on each pr to this repo.

How to use: 

1. make a folder (ie: packets)
2. dump many minecraft versions into packets folder, their folder names must be their semver number/snapshot name (ie 1.8.9 or 21w07a), the packets put in this repo should follow the same format as when dumped from [clientProxy.js](bin/clientProxy.js) or [dumpPackets.js](bin/dumpPackets.js)
3. enter the packets directory and run the tool [metricAggregator.js](bin/metricAggregator.js)
4. you should now have a file called README.md in the root of the packets/ directory

### For rest: TODO, for now, see jsdoc

