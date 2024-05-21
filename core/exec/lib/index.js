'use strict';
const path = require('path')
const Package = require('@ws-cli/package')
const log = require('@ws-cli/log')

const SETTINGS = {
  init: '@ws-cli/init',
}

const CACHE_DIR = 'dependencies'

async function exec() {
  let targetPath = process.env.CLI_TARGET_PATH
  let storeDir, pkg
  const homePath = process.env.CLI_HOME_PATH
  log.verbose('cli', `targetPath ${targetPath}, homePath ${homePath}`)

  const commandObj = arguments[arguments.length - 1]
  const commandName = commandObj.name()
  const packageName = SETTINGS[commandName]
  const packageVersion = 'latest'

  if(!targetPath) {
    // targetPath = '' // 生成缓存路径
    targetPath = path.resolve(homePath, CACHE_DIR)
    storeDir = path.resolve(targetPath, 'node_modules')
    log.verbose('targetPath:', targetPath)
    log.verbose('storeDir:', storeDir)
    pkg = new Package({ targetPath, storeDir, packageName, packageVersion })
    if (await pkg.exists()) {
      // 更新Package
      // log.warn('cli', 'hhereeeeeee1')
      await pkg.update()
    } else {
      // log.warn('cli', 'hhereeeeeee2')
      // 安装Package
      await pkg.install()
    }
  } else {
    pkg = new Package({ targetPath, packageName, packageVersion })
  }
  const rootFile = pkg.getRootFilePath()
  if (rootFile) {
    require(rootFile).apply(null, arguments)
  }

  // console.log('exec getRootFilePath: ', pkg.getRootFilePath())
  // console.log('target path: 222', process.env.CLI_TARGET_PATH)
}

module.exports = exec;