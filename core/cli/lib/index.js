'use strict';

module.exports = core;

// require加载类型
// require: .js/.json/.node
// .js --> module.exports/exports
// .json --> JSON.parse
// .node --> c++ Addons   使用process.dlopen打开
// any --> .js  其他所有文件默认用.js解析
const semver = require('semver');
const colors = require('colors/safe');
const userHome = require('user-home');
const minimist = require('minimist')
const dotenv = require('dotenv')
const path = require('path')
const rootCheck = require('root-check')
const pathExists = require('path-exists').sync
const commander = require('commander')

const pkg = require('../package.json')
const log = require('@ws-cli/log')
const exec = require('@ws-cli/exec')
const { getNpmSemverVersion } = require('@ws-cli/get-npm-info')

const constant = require('./const')

const program = new commander.Command()

async function core() {
  try {
    await prepare()

    registerCommand()
  } catch (error) {
    log.error(error.message)
    if (process.env.LOG_LEVEL ==='verbose') {
      console.log(error)
    }
  }
}

function registerCommand() {
  // console.log('program: ', program)
  const init = require('@ws-cli/init')
  program
    .name(Object.keys(pkg.bin)[0])
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d, --debug', '是否开启调试模式', false)
    .option('-v, --verbose', 'verbosity that can be increased')
    .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径')
    .command('init [projectName]')
    .option('-f, --force', '是否强制初始化项目')
    .action(exec)
    // .command('install [name]', 'install one or more packages')
    // .command('search [query]', 'search with optional query')

  // 开启调试模式
  program.on('option:debug', () => {
    const options = program.opts();
    process.env.LOG_LEVEL = options.debug ? 'verbose' : 'info'
    log.level = process.env.LOG_LEVEL
  })

  // 指定全局的targetPath
  program.on('option:targetPath', () => {
    const options = program.opts();
    process.env.CLI_TARGET_PATH = options.targetPath
  })

  // 对未知命令的监听
  program.on('command:*', (obj) => {
    const availableCommands = program.commands.map(cmd => cmd.name())
    log.info('cli', colors.red(`未知的命令 ${obj[0]}`))
    log.info('cli', colors.red(`可用的命令 ${availableCommands.join(',')}`))
  })

  program.parse(process.argv)

  if (program.args && program.args.length < 1) {
    program.outputHelp()
    console.log()
  }
}

async function prepare() {
  // 检查包版本、检查Node版本
  // 检查当前用户非Root、检查用户登录用户主目录
  // 检查输入参数、检查环境变量
  // 检查是否最新版本
  checkPkgVersion()
  checkNodeVersion()
  checkRoot()
  checkUserHome()
  // checkInputArgs()
  checkEnv()
  await checkGlobalUpdate()
}

function checkPkgVersion() {
  log.notice('cli', `当前ws-cli版本 v${pkg.version}`)
}

function checkNodeVersion() {
  // 获取当前版本号
  // console.log(process.version)
  const currentVersion = process.version
  log.notice('cli',`当前Node.js版本 ${currentVersion}`)
  // 获取最低要求版本号比对
  const lowestVersion = constant.LOWEST_NODE_VERSION
  if (!semver.gte(currentVersion, lowestVersion)) {
    throw new Error(colors.red(`ws-cli需要安装 v${lowestVersion} 以上版本的 Node.js`))
  }
}

function checkRoot() {
  // console.log(process.geteuid())
  // root-check 2.0.0 不支持require导入
  // 自动降级权限。Try to downgrade the permissions of a process with root privileges and block access if it fails
  rootCheck()
  log.verbose('cli',`已降级运行时权限：${process.geteuid()}`)
}

function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red(`当前登录用户主目录不存在！`))
  } else {
    log.verbose('cli', `当前登录用户主目录 ${userHome}`)
  }
}

function checkEnv() {
  const dotenvPath = path.resolve(userHome, '.env')
  if (pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath
    })
  }
  createDefaultConfig()
  log.verbose('环境变量：', process.env.CLI_HOME_PATH)
}

function createDefaultConfig() {
  const cliConfig = {
    home: userHome
  }
  if(process.env.CLI_HOME_PATH) {
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME_PATH)
  } else {
    cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME)
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome
}

async function checkGlobalUpdate() {
  // 获取当前版本号和模块名
  const currentVersion = pkg.version
  const npmName = pkg.name
  // 调用npm API，获取所有版本号
  // https://registry.npmjs.org/@ws-cli/utils
  const lastVersion  = await getNpmSemverVersion(currentVersion, npmName)
  if (lastVersion) {
    if (semver.gt(lastVersion, currentVersion)) {
      log.warn('cli', colors.yellow(`请手动更新 ${npmName}，当前版本：${currentVersion}，最新版本：${lastVersion}
        更新命令： npm install -g ${npmName}`))
    } else if (semver.eq(lastVersion, currentVersion)) {
      log.verbose('cli', `${npmName} 已经是最新版本，当前版本：${currentVersion}，最新版本：${lastVersion}`)
    }
  } else {
    log.error('cli', colors.red(`未找到 ${npmName}，未发布或名称错误`))
  }
  // 提取所有版本号，比对哪些版本号大于当前版本号
  // 获取最新版本号，提示用户更新到最新版本
}