'use strict';

const axios = require('axios')
const urlJoin = require('url-join')
const semver = require('semver')

function getNpmInfo(npmName, registry) {
  // 调用npm API，获取所有版本号
  // https://registry.npmjs.org/@ws-cli/utils
  if (!npmName) {
    return null
  }
  const registryUrl = registry || getDefaultRegistry(true)
  const npmInfoUrl = urlJoin(registryUrl, npmName)
  return axios.get(npmInfoUrl).then(response => {
    if (response.status === 200) {
      return response.data
    } else {
      return null
    }
  }).catch(err => {
    return Promise.reject(err)
  })
  // console.log('npmInfoUrl: ',npmInfoUrl, npmName, registry)
}

function getDefaultRegistry(isOriginal = false) {
  return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org'
}

async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry)
  if (data) {
    return Object.keys(data.versions)
  } else {
    return []
  }
}

function getNpmSemverVersions(baseVersion, versions) {
  return versions
    .filter(version => semver.satisfies(version, `^${baseVersion}`))
    .sort((a, b) => {
      return semver.gt(b, a) ? 1 : -1
    })
}

async function getNpmSemverVersion(baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry)
  const newVersions = getNpmSemverVersions(baseVersion, versions)
  if (newVersions && newVersions.length > 0) {
    return newVersions[0]
  }
  return ''
}

async function getNpmLatestVersion(npmName, registry) {
  let versions = await getNpmVersions(npmName, registry)
  console.log("🚀 ~ getNpmLatestVersion ~ versions:", versions)
  if (versions) {
    versions = versions //.sort((a, b) => { return semver.gt(b, a) })
      .sort(function (a, b) {
        return semver.gt(b, a) ? 1 : -1
      })
    console.log("🚀 ~ getNpmLatestVersion ~ versions sorted:", versions)
    return versions[0]
  }
  return null
}
module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersion,
  getDefaultRegistry,
  getNpmLatestVersion
};