'use strict';
const cp = require('child_process');
const { resolve } = require('path');
const Spinner = require('cli-spinner').Spinner;

function isObject(o) {
  // console.log("🚀 ~ isObject ~ Object.prototype.toString(o):", Object.prototype.toString.call(o) === "[object Object]")
  return Object.prototype.toString.call(o) === '[object Object]'
}

function spinnerStart(msg = 'loading..', spinnerString = '|/-\\') {
  var spinner = new Spinner(msg + ' %s')
  spinner.setSpinnerString(spinnerString)
  spinner.start()
  return spinner
}

function sleep(timeout = 1000) {
  return new Promise(resolve => setTimeout(resolve, timeout))
}

// 兼容win32下运行
function execute(command, args, options) {
  const win32 = process.platform === 'win32'

  const cmd = win32 ? 'cmd' : command
  const cmdArgs = win32 ? ['/c'].concat(command, args) : args
  // win32下执行命令方式为
  // cp.spawn('cmd', ['/c', 'node', '-e', code], {})
  // linux下执行命令为
  // cp.spawn('node', ['-e', code], {})
  return cp.spawn(cmd, cmdArgs, options || {})
}

function executeAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    const p = execute(command, args, options)
    p.on('error', e => {
      reject(e)
    })
    p.on('exit', c => {
      resolve(c)
    })
  })
}
module.exports = { isObject, spinnerStart, sleep, execute, executeAsync }
