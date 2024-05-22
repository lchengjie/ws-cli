'use strict';
const fs = require('fs');
const path = require('path')
const semver = require('semver');
const inquirer = require('inquirer')
// const colors = require('colors/safe');
const fse = require('fs-extra')
const userHome = require('user-home');

const Command = require('@ws-cli/command')
const Package = require('@ws-cli/package')
const { spinnerStart, sleep } = require('@ws-cli/utils')
const log = require('@ws-cli/log')

const getProjectTemplate = require('./getProjectTemplate')

const TYPE_PROJECT = 'project'
const TYPE_COMPONENT = 'component'

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || ''
    // this.force = !!this._cmd.opts().force
    // TODO 需要验证是否正确
    const options = this._argv[1] || {}
    this.force = !!options.force
    log.verbose('projectName:', this.projectName)
    log.verbose('force:', this.force)
  }

  async exec() {
    try {
      // 准备阶段
      const projectInfo = await this.prepare()
      if (projectInfo) {
        // 下载模版
        this.projectInfo = projectInfo
        await this.downloadTemplate()
        // 安装模版
      }
    } catch (error) {
      log.error(error.message)
      if (process.env.LOG_LEVEL ==='verbose') {
        console.log(error)
      }
    }
  }
  // docker run -d --name wscli-mongo -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=mongoadmin  -e MONGO_INITDB_ROOT_PASSWORD=Password@1 -v ./mongodata2024:/etc/mongo mongo
  // docker exec -it wscli-mongo bash
  async downloadTemplate() {
    log.verbose('projectInfo', this.projectInfo)
    log.verbose('template', this.template)
    const { projectTemplate } = this.projectInfo
    const templateInfo = this.template.find(item => item.npmName === projectTemplate)
    log.verbose('templateInfo', templateInfo)
    console.log(userHome)
    const targetPath = path.resolve(userHome, '.ws-cli', 'template')
    const storeDir = path.resolve(userHome, '.ws-cli', 'template', 'node_modules')
    console.log(targetPath, storeDir)
    const { npmName, version } = templateInfo
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version
    })
    if (!await templateNpm.exists()) {
      const spinner = spinnerStart('正在下载模版...')
      try {
        await templateNpm.install()
        await sleep(1000)
        log.success('下载模版成功')
      } catch (error) {
        throw error
      } finally {
        spinner.stop(true)
      }
    } else {
      const spinner = spinnerStart('正在更新模版...')
      try {
        await templateNpm.update()
        await sleep(1000)
        log.success('更新模版成功')
      } catch (error) {
        throw error
      } finally {
        spinner.stop(true)
      }
    }
    // const targetPath, storeDir

    // 通过项目模版API获取模版信息
    //    通过egg.js搭建一套后端系统
    //    通过npm项目存储模版
    //    将项目信息存储到mongodb数据库中
    //    通过egg.js获取mongodb中的数据并通过API返回
  }

  async prepare() {
    // 判断项目模版是否存在
    const template = await getProjectTemplate()
    console.log('template', template)
    if (!template || template.length === 0) {
      throw new Error('项目模版不存在')
    }
    this.template = template

    const localPath = process.cwd() // path.resolve('.')
    // 判断当前目录是否为空
    if (!this.isDirEmpty(localPath)) {
      let ifContinue = false
      if (!this.force) {
        ifContinue = (await inquirer.prompt({
            name: 'ifContinue',
            type: 'confirm',
            default: false,
            message: '当前文件夹不为空，是否继续创建项目？'
          })).ifContinue
        if (!ifContinue) {
          return
        }
      }
      // 是否启动强制更新
      if (ifContinue || this.force) {
        // 清空前给用户做二次确认
        const { confirmDelete } = await inquirer.prompt({
          name: 'confirmDelete',
          type: 'confirm',
          default: false,
          message: '是否清空当前目录下的文件？'
        })
        if (confirmDelete) {
          // 清空当前目录
          fse.emptyDir(localPath)
        }
      }
    }
    return await this.getProjectInfo()
  }
  async getProjectInfo() {
    let projectInfo = {}
    // 创建项目或组件
    const { type } = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: '请选择初始化类型',
      default: TYPE_PROJECT,
      choices: [{
        name: '项目',
        value: TYPE_PROJECT
      },{
        name: '组件',
        value: TYPE_COMPONENT
      }]
    })
    log.verbose('type', type)
    // 获取项目基本信息
    if (type === TYPE_PROJECT) {
      const project = await inquirer.prompt([{
        type: 'input',
        name: 'projectName',
        message: '请输入项目名称',
        default: '',
        validate: function(v) { 
          const done = this.async();

          setTimeout(function() {
            // 首字符必须为英文字母
            // 尾字符必须为英文、数字，不能为字符
            // 字符仅允许为-_
            // 合法：a,a-b,a_b,a-b-c,a-b_c,a_b_c,a-b1-c1,a_b1_c1
            // 不合法：1,a_,a-,a_1,a-1
            if (!/^[a-zA-Z]+([-][a-zA-Z]+[a-zA-Z0-9]*|[_][a-zA-Z]+[a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)) {
              done(`请输入合法的项目名称。
              规则：
              1.首字符必须为英文字母，
              2.尾字符必须为英文、数字，不能为字符，
              3.字符仅允许为-_。`);
              return;
            }
            done(null, true);
          }, 0)
          // return /^[a-zA-Z]+([-][a-zA-Z]+[a-zA-Z0-9]*|[_][a-zA-Z]+[a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)
        },
        // filter: (v) => { return v }
      }, {
        type: 'input',
        name: 'projectVersion',
        message: '请输入项目版本号',
        default: '1.0.0',
        validate: function(v) {
          const done = this.async();

          setTimeout(function() {
            // 合法：v1.2.3,1.2.3
            // 不合法：vv1.2.3,2
            if (!(!!semver.valid(v))) {
              // Pass the return value in the done callback
              done(`请输入合法的项目版本号`);
              return;
            }
            done(null, true);
          }, 0)
        },
        filter: (v) => { return !!semver.valid(v) ? semver.valid(v) : v }
      }, {
        type: 'list',
        name: 'projectTemplate',
        message: '请输入项目模版',
        default: '',
        choices: this.createTemplateChoices(),
        // validate: function(v) {
        //   const done = this.async();

        //   setTimeout(function() {
        //     // 合法：v1.2.3,1.2.3
        //     // 不合法：vv1.2.3,2
        //     if (!(!!semver.valid(v))) {
        //       // Pass the return value in the done callback
        //       done(`请输入合法的项目版本号`);
        //       return;
        //     }
        //     done(null, true);
        //   }, 0)
        // },
        // filter: (v) => { return !!semver.valid(v) ? semver.valid(v) : v }
      },])
      projectInfo = {
        type,
        ...project
      }
    } else if (type === TYPE_COMPONENT) {

    }

    return projectInfo
  }
  isDirEmpty(localPath) {
    let fileList = fs.readdirSync(localPath)
    // 文件过滤逻辑
    fileList = fileList.filter(file => !file.startsWith('.') && ['node_modules'].indexOf(file) < 0)
    return !fileList || fileList.length <= 0
  }
  createTemplateChoices() {
    return this.template.map(item => ({
      value: item.npmName,
      name: item.name
    }))
  }
}

function init(argv) {
  console.log('init ', argv)
  return new InitCommand(argv)
}

module.exports = init
module.exports.InitCommand = InitCommand

