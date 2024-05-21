'use strict';
const path = require('path')

const npminstall = require('npminstall')
const pkgDir = require('pkg-dir').sync
const pathExists = require('path-exists').sync
const fse = require('fs-extra')

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
    this.cacheFilePathPrefix = this.packageName.replace('/', '+')
  }

  async prepare() {
    if (this.storeDir && !pathExists(this.storeDir)) {
      fse.mkdirpSync(this.storeDir)
    }
    if (this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLatestVersion(this.packageName)
    }
  }
  get cacheFilePath() {
    // _@ws-cli_init@latest@@ws-cli
    // @ws-cli+init@1.0.10
    return this.getSpecificCacheFilePath(this.packageVersion)
    // return path.resolve(this.storeDir, '.store', `${this.cacheFilePathPrefix}@${this.packageVersion}`)
    // return path.resolve(this.storeDir, `${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`)
  }
  getSpecificCacheFilePath(version) {
    return path.resolve(this.storeDir, '.store', `${this.cacheFilePathPrefix}@${version}`)
  }
  // 判断当前Package是否存在
  async exists() {
    if (this.storeDir) {
      await this.prepare()
      // console.warn('this.cacheFilePath:', this.cacheFilePath)
      return pathExists(this.cacheFilePath)
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
    await this.prepare()
    // 获取最新的NPM模块版本号
    const latestPackageVersion = await getNpmLatestVersion(this.packageName)
    // 查询最新版本号对应的路径是否存在
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion)
    // 如果不存在，则直接安装最新版本
    if (!pathExists(latestFilePath)) {
      await npminstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(true),
        pkgs: [{
          name: this.packageName,
          version: latestPackageVersion
        }]
      })
      this.packageVersion = latestPackageVersion
    }
  }
  // 获取入口文件路径
  getRootFilePath() {
    function _getRootFile(targetPath) {
      // 获取package.json所在目录 pkg-dir
      const dir = pkgDir(targetPath)
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

    if (this.storeDir) {
      return _getRootFile(this.cacheFilePath)
    } else {
      return _getRootFile(this.targetPath)
    }
  }
}

module.exports = Package;
