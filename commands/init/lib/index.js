'use strict';
const fs = require('fs');
const path = require('path')
const semver = require('semver');
const inquirer = require('inquirer')
const kebabCase = require('kebab-case')
const { glob } = require('glob')
const ejs = require('ejs')
// const colors = require('colors/safe');
const fse = require('fs-extra')
const userHome = require('user-home');

const Command = require('@ws-cli/command')
const Package = require('@ws-cli/package')
const { spinnerStart, sleep, executeAsync } = require('@ws-cli/utils')
const log = require('@ws-cli/log')

const getProjectTemplate = require('./getProjectTemplate')

const TYPE_PROJECT = 'project'
const TYPE_COMPONENT = 'component'

const TEMPLATE_TYPE_NORMAL = 'normal'
const TEMPLATE_TYPE_CUSTOM = 'custom'

const WHITE_COMMAND = ['npm', 'cnpm']

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
        await this.installTemplate()
      }
    } catch (error) {
      log.error(error.message)
      if (process.env.LOG_LEVEL ==='verbose') {
        console.log(error)
      }
    }
  }
  async installTemplate() {
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL
      }
      const { type } = this.templateInfo
      if (type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate()
      } else if (type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装
        await this.installCustomTemplate()
      } else {
        throw new Error('项目模版类型无法识别')
      }
    } else {
      throw new Error('项目模版信息不存在')
    }
  }
  checkCommand(cmd) {
    return WHITE_COMMAND.includes(cmd) ? cmd : null
  }
  async executeCommand(command, errorMessage) {
    let result
    if (command) {
      const cmdArray = command.split(' ')
      const cmd = this.checkCommand(cmdArray[0])
      if (!cmd) {
        throw new Error('命令不存在！命令：' + command)
      }
      const args = cmdArray.slice(1)

      result = await executeAsync(cmd, args, {
        stdio: 'inherit',
        cwd: process.cwd()
      })
    }
    if (result !== 0) {
      throw new Error(errorMessage)
    }
  }
  async ejsRender(options) {
    const dir = process.cwd()
    const customIgnoreResults = await glob('**', {
      cwd: dir,
      ignore: options.ignore || '',
      nodir: true
    })
    await Promise.all(customIgnoreResults.map(file => {
      const filePath = path.join(dir, file)
      return new Promise((resolve1, reject1) => {
        ejs.renderFile(filePath, this.projectInfo, {}, (err, result) => {
          if (err) { reject1(err) }
          else {
            fse.writeFileSync(filePath, result)
            resolve1(result)
          }
        })
      })
    }))

    // return new Promise((resolve, reject) => {
    //   glob('**', {
    //     cwd: process.cwd(),
    //     ignore
    //   }, (err, files) => {
    //     if (err) {
    //       reject(err)
    //     }
    //     console.log(files)
    //     resolve(files)
    //   })
    // })
  }
  async installNormalTemplate() {
    log.info('标准安装', this.templateNpm, this.templateNpm.cacheFilePath)
    // 拷贝模版代码到当前目录
    const spinner = spinnerStart('正在安装模版...')
    let installSuccess = false
    try {
      const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template')
      const targetPath = process.cwd()
      fse.ensureDirSync(templatePath)
      fse.ensureDirSync(targetPath)
      fse.copySync(templatePath, targetPath)
      await sleep(1000)
      installSuccess = true
    } catch (error) {
      throw error
    } finally {
      spinner.stop(true)
      installSuccess && log.success('安装成功')
    }
    // 模版渲染
    console.log('tepm infor:', this.templateInfo)
    const templateIgnore = this.templateInfo.ignore || []
    const ignore = ['**/node_modules/**', ...templateIgnore]
    await this.ejsRender({ ignore })

    const { installCommand, startCommand } = this.templateInfo
    // 安装依赖
    await this.executeCommand(installCommand, '安装依赖失败')
    // 启动命令执行
    await this.executeCommand(startCommand, '启动执行命令失败')
  }
  async installCustomTemplate() {
    log.info('自定义安装')
  }
  // docker run -d --name wscli-mongo -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=mongoadmin  -e MONGO_INITDB_ROOT_PASSWORD=Password@1 -v ./mongodata2024:/etc/mongo mongo
  // docker exec -it wscli-mongo bash
  async downloadTemplate() {
    log.verbose('projectInfo', this.projectInfo)
    log.verbose('template', this.template)
    const { projectTemplate } = this.projectInfo
    const templateInfo = this.template.find(item => item.npmName === projectTemplate)
    log.verbose('templateInfo', templateInfo)
    this.templateInfo = templateInfo
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
      } catch (error) {
        throw error
      } finally {
        spinner.stop(true)
        if (await templateNpm.exists()) {
          log.success('下载模版成功')
          this.templateNpm = templateNpm
        }
      }
    } else {
      const spinner = spinnerStart('正在更新模版...')
      try {
        await templateNpm.update()
        await sleep(1000)
      } catch (error) {
        throw error
      } finally {
        spinner.stop(true)
        if (await templateNpm.exists()) {
          log.success('更新模版成功')
          this.templateNpm = templateNpm
        }
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
    function isValidName(v) {
      return /^[a-zA-Z]+([-][a-zA-Z]+[a-zA-Z0-9]*|[_][a-zA-Z]+[a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)
    }

    let projectInfo = {}
    let isProjectNameValid = false
    if (isValidName(this.projectName)) {
      isProjectNameValid = true
      projectInfo.projectName = this.projectName
    }
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
    const title = type === TYPE_PROJECT ? '项目' : '组件'

    this.template = this.template.filter(template => template.tag.includes(type))

    const projectNamePrompt = {
      type: 'input',
      name: 'projectName',
      message: `请输入${title}名称`,
      default: '',
      validate: function(v) { 
        const done = this.async();

        setTimeout(function() {
          // 首字符必须为英文字母
          // 尾字符必须为英文、数字，不能为字符
          // 字符仅允许为-_
          // 合法：a,a-b,a_b,a-b-c,a-b_c,a_b_c,a-b1-c1,a_b1_c1
          // 不合法：1,a_,a-,a_1,a-1
          // if (!/^[a-zA-Z]+([-][a-zA-Z]+[a-zA-Z0-9]*|[_][a-zA-Z]+[a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)) {
          if (!isValidName(v)) {
            done(`请输入合法的${title}名称。
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
    }
    const projectPrompt = []
    if (!isProjectNameValid) {
      projectPrompt.push(projectNamePrompt)
    }
    projectPrompt.push({
      type: 'input',
      name: 'projectVersion',
      message: `请输入${title}版本号`,
      default: '1.0.0',
      validate: function(v) {
        const done = this.async();

        setTimeout(function() {
          // 合法：v1.2.3,1.2.3
          // 不合法：vv1.2.3,2
          if (!(!!semver.valid(v))) {
            // Pass the return value in the done callback
            done(`请输入合法的${title}版本号`);
            return;
          }
          done(null, true);
        }, 0)
      },
      filter: (v) => { return !!semver.valid(v) ? semver.valid(v) : v }
    }, {
      type: 'list',
      name: 'projectTemplate',
      message: `请输入${title}模版`,
      default: '',
      choices: this.createTemplateChoices(),
    })
    // 获取项目基本信息
    if (type === TYPE_PROJECT) {
      const project = await inquirer.prompt(projectPrompt)
      projectInfo = {
        ...projectInfo,
        type,
        ...project
      }
    } else if (type === TYPE_COMPONENT) {
      const descriptionPrompt = {
        type: 'input',
        name: 'componentDescription',
        message: '请输入组件描述信息',
        default: '',
        validate: function(v) {
          const done = this.async();
          setTimeout(function() {
            if (!v) {
              done(`请输入组件描述信息`);
              return;
            }
            done(null, true);
          }, 0)
        }
      }
      projectPrompt.push(descriptionPrompt)
      // 获取组件基本信息
      const project = await inquirer.prompt(projectPrompt)
      projectInfo = {
        ...projectInfo,
        type,
        ...project
      }
    }
    // 生成className
    if (projectInfo.projectName) {
      projectInfo.name = projectInfo.projectName
      projectInfo.className = kebabCase(projectInfo.projectName).replace(/^-/, '')
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion
    }
    if (projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription
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

