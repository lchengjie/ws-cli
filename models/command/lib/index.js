'use strict';
const semver = require('semver');
const colors = require('colors/safe');

const log = require('@ws-cli/log')

const LOWEST_NODE_VERSION = '20.0.0'

class Command {
  constructor(argv) {
    log.verbose('Command constructor', argv)
    if (!argv) {
      throw new Error('参数不能为空')
    }
    if (!Array.isArray(argv)) {
      throw new Error('参数必须为数组')
    }
    if (argv.length < 1) {
      throw new Error('参数列表为空')
    }
    this._argv = argv
    
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve()
      chain
        .then(() => this.checkNodeVersion())
        .then(() => this.initArgs())
        .then(() => this.init())
        .then(() => this.exec())
        .catch((error) => {
          log.error(error.message)
          if (process.env.LOG_LEVEL ==='verbose') {
            console.log(error)
          }
        })
    })
  }
  initArgs() {
    this._cmd = this._argv[this._argv.length -1]
    this._argv = this._argv.slice(0, this._argv.length - 1)
    log.verbose('cmd', this._cmd)
    log.verbose('argv', this._argv)
    // console.log('cmd, argv,', this._cmd, this._argv)
  }
  checkNodeVersion() {
    // 获取当前版本号
    // console.log(process.version)
    const currentVersion = process.version
    log.notice('cli',`当前Node.js版本 ${currentVersion}`)
    // 获取最低要求版本号比对
    const lowestVersion = LOWEST_NODE_VERSION
    if (!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(colors.red(`ws-cli需要安装 v${lowestVersion} 以上版本的 Node.js`))
    }
  }

  init() {
    throw new Error('init必须实现')
  }

  exec() {
    throw new Error('exec必须实现')
  }
}

module.exports = Command;
