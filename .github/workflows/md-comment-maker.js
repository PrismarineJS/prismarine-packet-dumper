const { join } = require('path')
const mcData = require('minecraft-data')
const fsp = require('fs/promises')
const { readdirSync } = require('fs')

const makeDropdownStart = name => `<details><summary>${name}</summary>\n<p>\n\n`
const makeDropdownEnd = () => '\n</p></details>'
const readFile = fileName => fsp.readFile(fileName, 'utf-8')
const pathToPacketFolders = 'packets'
const getDirectories = source =>
  readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
const versionFolders = getDirectories(pathToPacketFolders)
  .filter(o => o !== 'node_modules')
  .sort((a, b) => {
    if (a === b) {
      return 0
    } else if (mcData(a).isNewerOrEqualTo(b)) {
      return 1
    } else {
      return -1
    }
  })
function packetStr ({ collected, missing }, packet) {
  if (collected.includes(packet)) {
    return '✔️'
  } else if (missing.includes(packet)) {
    return '❌'
  }
  return ' '
}

const data = versionFolders.reduce((acc, curr) => {
  acc[curr] = require(join(process.cwd(), pathToPacketFolders, curr, 'metadata', 'packets_info.json'))
  return acc
}, {})

const packetNames = new Set()

Object.values(data).forEach(({ collected, missing }) => {
  collected.forEach(x => packetNames.add(x))
  missing.forEach(x => packetNames.add(x))
})

async function main () {
  const files = await (await fsp.readdir(join(process.cwd(), 'diffs'))).map(name => join(process.cwd(), 'diffs', name))
  let txt = makeDropdownStart('Packet Coverage Diffs')
  txt += '\n' + await (await Promise.all(files.map(readFile)))
    .filter(text => text !== '')
    .map((text, ix) => {
      const versionName = files[ix].split('/').slice(-1)[0].replace('.diff', '')
      return [versionName, `${makeDropdownStart(versionName)}\`\`\`diff\n${text}\n\`\`\`${makeDropdownEnd()}`]
    })
    // have to split since a & b are paths and we only want the end bit
    .sort(([a], [b]) => mcData(a).version['>='](b))
    .map(data => data[1])
    .join('\n')
  txt += makeDropdownEnd() + '\n'
  // start translating:
  txt += makeDropdownStart('Packet Coverage Graph')
  txt += '| Packet Name |' + (versionFolders.map(x => ` ${x} `).join('|') + '|') + '\n'
  txt += '| --- |' + versionFolders.map(() => '---').join('|') + '|' + '\n'
  const scrapedStats = Object.values(data)
  txt += Array
    .from(packetNames)
    .map(packetName => `| ${packetName} |` + (scrapedStats.map(stats => ` ${packetStr(stats, packetName)} `).join('|')) + '|' + '\n').join('')
  txt += makeDropdownEnd() + '\n'

  txt += makeDropdownStart('Packet Coverage Stats')
  const getPercentage = ver => (data[ver].collected.length / (data[ver].collected.length + data[ver].missing.length)) * 100
  const getTotalX = type => scrapedStats.reduce((acc, current) => acc + current[type].length, 0)
  const getTotalPercent = `${(getTotalX('collected') / (getTotalX('collected') + getTotalX('missing')) * 100).toFixed(0)}%`

  txt += '| Version | Coverage % |' + '\n'
  txt += '| --- | --- |' + '\n'
  txt += versionFolders.map(x => `| ${x} | ${getPercentage(x).toFixed(0)}% |`).join('\n')
  // total
  txt += '| | |' + '\n'
  txt += `| Average | ${getTotalPercent} |` + '\n'

  txt += makeDropdownEnd()

  await fsp.writeFile('README.md', txt)
}

main()
