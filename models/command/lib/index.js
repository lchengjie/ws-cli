'use strict';
// const fs = require('fs');

const semver = require('semver');
// const inquirer = require('inquirer')
const colors = require('colors/safe');
// const fse = require('fs-extra')

const log = require('@ws-cli/log')

const LOWEST_NODE_VERSION = '20.0.0'
// const TYPE_PROJECT = 'project'
// const TYPE_COMPONENT = 'component'

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

  // async exec() {
  //   try {
  //     // 准备阶段
  //     const ret = await this.prepare()
  //     if (ret) {
  //       // 下载模版
  //       // 安装模版
  //     }
  //   } catch (error) {
  //     log.error(error.message)
  //     if (process.env.LOG_LEVEL ==='verbose') {
  //       console.log(error)
  //     }
  //   }
  // }

  // async prepare() {
  //   const localPath = process.cwd() // path.resolve('.')
  //   // 判断当前目录是否为空
  //   if (!this.isDirEmpty(localPath)) {
  //     let ifContinue = false
  //     if (!this.force) {
  //       ifContinue = (await inquirer.prompt({
  //           name: 'ifContinue',
  //           type: 'confirm',
  //           default: false,
  //           message: '当前文件夹不为空，是否继续创建项目？'
  //         })).ifContinue
  //       if (!ifContinue) {
  //         return
  //       }
  //     }
  //     // 是否启动强制更新
  //     if (ifContinue || this.force) {
  //       // 清空前给用户做二次确认
  //       const { confirmDelete } = await inquirer.prompt({
  //         name: 'confirmDelete',
  //         type: 'confirm',
  //         default: false,
  //         message: '是否清空当前目录下的文件？'
  //       })
  //       if (confirmDelete) {
  //         // 清空当前目录
  //         fse.emptyDir(localPath)
  //       }
  //     }
  //   }
  //   return await this.getProjectInfo()
  // }
  // async getProjectInfo() {
  //   const projectInfo = {}
  //   // 创建项目或组件
  //   const { type } = await inquirer.prompt({
  //     type: 'list',
  //     name: 'type',
  //     message: '请选择初始化类型',
  //     default: TYPE_PROJECT,
  //     choices: [{
  //       name: '项目',
  //       value: TYPE_PROJECT
  //     },{
  //       name: '组件',
  //       value: TYPE_COMPONENT
  //     }]
  //   })
  //   log.verbose('type', type)
  //   // 获取项目基本信息
  //   if (type === TYPE_PROJECT) {
  //     const { projectName, projectVersion } = await inquirer.prompt([{
  //       type: 'input',
  //       name: 'projectName',
  //       message: '请输入项目名称',
  //       default: '',
  //       validate: function(v) { 
  //         // 首字符必须为英文字母
  //         // 尾字符必须为英文、数字，不能为字符
  //         // 字符仅允许为-_
  //         // 合法：a,a-b,a_b,a-b-c,a-b_c,a_b_c,a-b1-c1,a_b1_c1
  //         // 不合法：1,a_,a-,a_1,a-1
  //         return /^[a-zA-Z]+([-][a-zA-Z]+[a-zA-Z0-9]*|[_][a-zA-Z]+[a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)
  //       },
  //       // filter: (v) => { return v }
  //     },{
  //       type: 'input',
  //       name: 'projectVersion',
  //       message: '请输入项目版本号',
  //       default: '',
  //       validate: (v) => { return v },
  //       filter: (v) => { return true }
  //     }])
  //     console.log(projectName, projectVersion )
  //   } else if (type === TYPE_COMPONENT) {

  //   }
  // }
  // isDirEmpty(localPath) {
  //   let fileList = fs.readdirSync(localPath)
  //   // 文件过滤逻辑
  //   fileList = fileList.filter(file => !file.startsWith('.') && ['node_modules'].indexOf(file) < 0)
  //   return !fileList || fileList.length <= 0
  // }
}

module.exports = Command;
