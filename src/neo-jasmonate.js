const got = require('got')
const key = require('../key/keystore.js')

const username = key.rtUname
const password = key.rtPwd
const baseHost = key.rtHost
let loginToken = ''
let loginSession = ''
let pid = ''
let connectedObj = {}
let DHCPObj = {}
let debug = false

async function buildRequest (hostUrl, method, reqHeader, reqData) {
  logger('building request...')
  let options = {
    method: method,
    headers: reqHeader,
    followRedirect: false
  }
  if (method === 'POST') {
    options.body = reqData
  }
  let req = await got(hostUrl, options)
  return req
}

async function getLoginToken () {
  logger('->getting login token')
  let reqHeader = {
    'Host': '192.168.1.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Cookie': '_TESTCOOKIESUPPORT=1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0'
  }
  try {
    let {body} = await buildRequest(baseHost, 'GET', reqHeader)
    const searchKey = 'getObj("Frm_Logintoken").value = "'
    const keyStart = body.indexOf(searchKey) + searchKey.length
    let rBody = body.substr(keyStart)
    const keyEnd = rBody.indexOf('";')
    loginToken = rBody.substr(0, keyEnd)
    logger('login token : ' + loginToken + '\n')
  } catch (error) {
    logger(error)
    logger('-<Error - getLoginToken()\n')
  }
}

async function getLoginSession () {
  if (loginToken === '') await getLoginToken()
  logger('->getting login session')

  let reqHeader = {
    'Host': '192.168.1.1',
    'Connection': 'keep-alive',
    'Content-Length': '74',
    'Cache-Control': 'max-age=0',
    'Origin': 'http://192.168.1.1',
    'Upgrade-Insecure-Requests': '1',
    'DNT': '1',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cookie': '_TESTCOOKIESUPPORT=1'
  }
  let reqBody = `frashnum=&action=login&Frm_Logintoken=${loginToken}&Username=${username}&Password=${password}`
  try {
    let {headers} = await buildRequest(baseHost, 'POST', reqHeader, reqBody)
    loginSession = headers['set-cookie'][0].split(';')[0].substr(4)
    logger('login session : ' + loginSession + '\n')
  } catch (error) {
    logger(error)
    logger('-<Error - getSession()\n')
  }
}

async function getPid () {
  if (loginSession === '') await getLoginSession()
  logger('->getting pid')

  let reqHeader = {
    'Host': '192.168.1.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Cookie': `_TESTCOOKIESUPPORT=1; SID=${loginSession}`,
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  }
  try {
    // if no session, headers['content-length'] = 676
    let {body} = await buildRequest(baseHost + 'template.gch', 'GET', reqHeader)
    const searchKey = 'var ret = "getpage.gch?pid='
    const keyStart = body.indexOf(searchKey) + searchKey.length
    body = body.substr(keyStart)
    const keyEnd = body.indexOf('&nextpage=')
    pid = body.substr(0, keyEnd)
    logger('pid : ' + pid + '\n')
  } catch (error) {
    logger(error)
    logger('-<Error - getPid()\n')
  }
}

async function getConnectedDevices () {
  if (pid === '') await getPid()
  if (loginSession === '') await getLoginSession()

  logger('->getting connected devices')

  let objStruct = [
    {key: 'DeviceName', index: 'deviceName'},
    {key: 'ADMACAddress', index: 'macAddress'},
    {key: 'ADIPAddress', index: 'ipAddress'},
    {key: 'ADAuthState', index: 'authState'},
    {key: 'MCS', index: 'mcs'},
    {key: 'RSSI', index: 'rssi'},
    {key: 'TXRate', index: 'txRate'},
    {key: 'RXRate', index: 'rxRate'},
    {key: 'CurrentMode', index: 'wifiMode'}
  ]
  let reqUrl = `${baseHost}getpage.gch?pid=${pid}&nextpage=net_wlanm_assoc1_t.gch`
  let reqHeader = {
    'Host': '192.168.1.1',
    'DNT': '1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cookie': `_TESTCOOKIESUPPORT=1; SID=${loginSession}`,
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  }

  try {
    let devicesCount = 0
    let {body} = await buildRequest(reqUrl, 'GET', reqHeader)
    let countKey = body.match(/ADMACAddress[0-9]+/g)
    if (countKey) {
      devicesCount = countKey.length / 3
      connectedObj = scrapConnectedDevices(body, devicesCount, objStruct)
    } else devicesCount = 0
    logger(connectedObj)
    logger('devices count : ' + devicesCount + '\n')
    return connectedObj
  } catch (error) {
    logger(error)
    logger('Error - getConnectedDevices')
    return error
  }
}

async function getDHCPList () {
  if (pid === '') await getPid()
  if (loginSession === '') await getLoginSession()

  logger('->getting DHCP list')

  let objStruct = [
    {key: 'MACAddr', index: 'macAddress'},
    {key: 'IPAddr', index: 'ipAddress'},
    {key: 'HostName', index: 'hostName'},
    {key: 'ExpiredTime', index: 'expiredTime'},
    {key: 'PhyPortName', index: 'ifName'}
  ]
  let reqUrl = `${baseHost}getpage.gch?pid=${pid}&nextpage=net_dhcp_dynamic_t.gch`
  let reqHeader = {
    'Host': '192.168.1.1',
    'DNT': '1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cookie': `_TESTCOOKIESUPPORT=1; SID=${loginSession}`,
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  }

  try {
    let devicesCount = 0
    let {body} = await buildRequest(reqUrl, 'GET', reqHeader)
    let countKey = body.match(/MACAddr[0-9]+/g)
    if (countKey) {
      devicesCount = countKey.length / 3
      DHCPObj = scrapConnectedDevices(body, devicesCount, objStruct)
    } else devicesCount = 0
    logger(DHCPObj)
    logger('dhcp count : ' + devicesCount)
    return DHCPObj
  } catch (error) {
    logger(error)
    logger('Error - getDHCPList')
    return error
  }
}

async function logout () {
  loginToken = ''
  loginSession = ''
  pid = ''
  connectedObj = {}
  DHCPObj = {}
  logger('\n->logging out')
  let reqHeader = {
    'Host': '192.168.1.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': '40',
    'Cookie': '_TESTCOOKIESUPPORT=1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  }
  let reqBody = 'logout=1'
  try {
    let {statusCode} = await buildRequest(baseHost, 'POST', reqHeader, reqBody)
    logger('Logged out (status : ' + statusCode + ')')
    return statusCode
  } catch (error) {
    logger(error)
    return error
  }
}

function scrapConnectedDevices (data, n, objStruct) {
  const endTag = `');</script>`

  let resultObj = {}
  let resultArr = []
  for (let i = 0; i < n; i++) {
    resultArr[i] = {}

    for (let j = 0; j < objStruct.length; j++) {
      let startKey = `${objStruct[j]['key']}${i}','`
      data = data.substr(data.indexOf(startKey) + startKey.length)

      resultArr[i][objStruct[j]['index']] = data.substr(0, data.indexOf(endTag))
        .replace(/\\x([\d\w]{2})/gi, function (match, grp) {
          return String.fromCharCode(parseInt(grp, 16))
        })
    }
  }

  for (let i = 0; i < resultArr.length; i++) {
    let mac = resultArr[i]['macAddress']
    delete resultArr[i]['macAddress']
    resultObj[mac] = resultArr[i]
  }

  return resultObj
}

function logger (log) {
  if (debug) {
    console.log(log)
  }
}

module.exports = {
  debug: debug,
  logout: logout,
  getDHCPList: getDHCPList,
  getConnectedDevices: getConnectedDevices
}
