const dateTime = require('node-datetime')
const jasmonate = require('./neo-jasmonate')
const ui = require('./blessedUI')
const admin = require('firebase-admin')
const serviceAccount = require('../key/jasmonate2-firebase-adminsdk-rpb1l-f12e70d789.json')
const key = require('../key/keystore.js')

// init firebase admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: key.dbUrl
})

// init references
const db = admin.database()
const ref = db.ref('/')
const fetchRef = ref.child('fetch')
const dhcpRef = ref.child('data/dhcp')
const connectedRef = ref.child('data/connected')

// getting data from router
let connectedList = {}
let dhcpList = {}
async function jasmineFetch () {
  connectedList = await jasmonate.getConnectedDevices()
  dhcpList = await jasmonate.getDHCPList()
  await jasmonate.logout()
}

// starting blessedUI
let uiContent = ''
ui.mainBox.focus()
ui.screen.render()

// blessed functions
ui.screen.key(['C-c'], (ch, key) => {
  fetchRef.off()
  return process.exit(0)
})

function printScreen (txt) {
  ui.mainBox.setContent(txt)
  ui.loadingBox.hide()
  ui.screen.render()
}

function getTime () {
  let dt = dateTime.create()
  let time = dt.format('Y-m-d H:M:S')
  return time
}

// firebase functions
let initFlag = 0

function listenerHandler (snapshot) {
  if (initFlag === 0) {
    initFlag = 1
  } else {
    let mode = snapshot.val().data
    let txt = `${mode} by $${snapshot.key}`
    uiContent += `(req - ${getTime()}) ${txt} \n`
    printScreen(uiContent)
    fetchNWrite(mode)
  }
}

function listenerErrHandler (errorObject) {
  uiContent += `(err - ${getTime()}) ${errorObject.code.message()} \n`
  printScreen(uiContent)
}

async function fetchNWrite (mode) {
  await jasmineFetch()
  if (mode === 'dhcp') {
    dhcpRef.set(dhcpList)
  } else if (mode === 'connected') {
    connectedRef.set(connectedList)
  } else if (mode === 'all') {
    connectedRef.set(connectedList)
    dhcpRef.set(dhcpList)
  }
}

fetchRef.on('child_changed', listenerHandler, listenerErrHandler)
fetchRef.on('child_added', listenerHandler, listenerErrHandler)
