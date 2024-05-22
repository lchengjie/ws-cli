'use strict';
const cp = require('child_process')
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
    try {
      // require(rootFile).apply(null, arguments)
      // 使用call，并将第二个参数变成数组，则被调用放只需要接收一个参数
      // require(rootFile).call(null, Array.from(arguments))
      const args = Array.from(arguments)
      const cmd = args[args.length - 1]
      // 瘦身cmd
      const o = Object.create(null)
      Object.keys(cmd).forEach(key => {
        if (cmd.hasOwnProperty(key) && !key.startsWith('_') && key !== 'parent') {
          o[key] = cmd[key]
        }
      })
      args[args.length - 1] = o
      // console.log('000000', args)
      // require(rootFile).call(null, JSON.stringify(args))

      const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`
      // console.log('000000', code)
      const child = spawn('node', ['-e', code], {
        cwd: process.cwd()
        // 这是一种实现方式，需要监听error和exit两个事件
        , stdio: 'inherit'
      })
      // log.warn('child: ', child)
      // child.stdout.on('data', (chunk) => {})
      // child.stderr.on('data', (chunk) => {})

    } catch (error) {
      log.error(error.message)
      if (process.env.LOG_LEVEL ==='verbose') {
        console.log(error)
      }
    }
  }

  // console.log('exec getRootFilePath: ', pkg.getRootFilePath())
  // console.log('target path: 222', process.env.CLI_TARGET_PATH)
}

// 兼容win32下运行
function spawn(command, args, options) {
  const win32 = process.platform === 'win32'

  const cmd = win32 ? 'cmd' : command
  const cmdArgs = win32 ? ['/c'].concat(command, args) : args
  // win32下执行命令方式为
  // cp.spawn('cmd', ['/c', 'node', '-e', code], {})
  // linux下执行命令为
  // cp.spawn('node', ['-e', code], {})
  return cp.spawn(cmd, cmdArgs, options || {})
}

module.exports = exec;