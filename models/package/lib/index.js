'use strict';
const path = require('path')

const npminstall = require('npminstall')
const pkgDir = require('pkg-dir').sync
const pathExists = require('path-exists').sync

const { isObject } = require('@ws-cli/utils')
const formatPath = require('@ws-cli/format-path')
const { getDefaultRegistry, getNpmLatestVersion } = require('@ws-cli/get-npm-info')

class Package {
  constructor(options) {
    if (!options) {
      throw new Error('Package类的options不能为空！')
    }
    if (!isObject(options)) {
      throw new Error('Package类的options必须为对象！')
    }
    // Package的路径
    this.targetPath = options.targetPath
    // 缓存Package的路径
    this.storeDir = options.storeDir
    // // Package的本地缓存存储路径
    // this.storePath = options.storePath
    // Package名称
    this.packageName = options.packageName
    // Package版本
    this.packageVersion = options.packageVersion
  }

  async prepare() {
    if (this.packageVersion === 'latest') {
      await getNpmLatestVersion(this.packageName)
    }
    console.log(this.packageVersion)
  }
  // 判断当前Package是否存在
  async exists() {
    if (this.storeDir) {
      await this.prepare()
    } else {
      return pathExists(this.targetPath)
    }
  }
  // 安装Package
  async install() {
    await this.prepare()
    await npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(true),
      pkgs: [{
        name: this.packageName,
        version: this.packageVersion
      }]
    })
  }
  // 更新Package
  async update() {

  }
  // 获取入口文件路径
  getRootFilePath() {
    // 获取package.json所在目录 pkg-dir
    const dir = pkgDir(this.targetPath)
    if (dir) {
      // 读取package.json -- require()  js/json/ode
      const pkgFile = require(path.resolve(dir, 'package.json'))
      // main/lib 转成path
      if (pkgFile && pkgFile.main) {
        // 路径兼容 (macos, windows)
        return formatPath(path.resolve(dir, pkgFile.main))
      }
    }
    return null
  }
}

module.exports = Package;
