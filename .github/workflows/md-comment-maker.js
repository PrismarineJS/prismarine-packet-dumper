const { join } = require('path')
const mcData = require('minecraft-data')
const fsp = require('fs/promises')

const makeDropdownStart = name => `<details><summary>${name}</summary>\n<p>\n\n`
const makeDropdownEnd = () => '\n</p></details>'
const readFile = fileName => fsp.readFile(fileName, 'utf-8')

async function main () {
  const files = await (await fsp.readdir(join(process.cwd(), 'diffs'))).map(name => join(process.cwd(), 'diffs', name))
  let txt = makeDropdownStart('Packet Coverage Diffs')
  txt += '\n' + await (await Promise.all(files.map(readFile)))
    .filter(text => text !== '')
    .map((text, ix) => {
      const fileName = files[ix].split('\\').pop().replace('.diff', '')
      return [fileName, `${makeDropdownStart(fileName)}\`\`\`diff\n${text}\n\`\`\`${makeDropdownEnd()}`]
    })
    .sort(([a], [b]) => mcData(a).version.version - mcData(b).version.version)
    .map(data => data[1])
    .join('\n')
  txt += makeDropdownEnd()
  await fsp.writeFile('lol.md', txt)
}

main()
