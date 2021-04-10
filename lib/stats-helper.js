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

function makeMarkdown (data) {
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

function parsePacketCounter (version, kindCounter) {
  const mcData = require('minecraft-data')(version)
  // record packets
  return {
    collectedPackets: Object.keys(kindCounter),
    allPackets: Object.keys(mcData.protocol.play.toClient.types)
      .filter(o => o.startsWith('packet_'))
      .map(o => o.replace('packet_', ''))
  }
}

module.exports = { makeMarkdown, parsePacketCounter }
