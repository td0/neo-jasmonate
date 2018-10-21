const blessed = require('blessed')

/*
    BLESSED YOU!
*/
// main screen
const screen = blessed.screen({
  smartCSR: true,
  warning: true,
  title: 'Neo Jasmonate'
})

const mainBox = blessed.box({
  parent: screen,
  input: true,
  keys: true,
  vi: true,
  tags: true,
  top: 0,
  left: 0,
  width: '100%',
  style: {
    fg: 'white',
    border: {
      fg: '#f0f0f0'
    },
    scrollbar: {
      inverse: true
    }
  },
  scrollable: true,
  scrollbar: {
    ch: ' '
  }
})

const loadingBox = blessed.box({
  parent: mainBox,
  mouse: true,
  top: 'center',
  left: 'center',
  valign: 'middle',
  width: 35,
  height: 5,
  content: '{center}{bold}Loading List...{/bold}{/center}',
  tags: true,
  border: {type: 'line'},
  style: {
    fg: 'black',
    bg: 'yellow',
    border: {fg: 'yellow'}
  }
})

screen.append(mainBox)

module.exports = {
  screen: screen,
  mainBox: mainBox,
  loadingBox: loadingBox
}
