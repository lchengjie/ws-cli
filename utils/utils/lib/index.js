'use strict';
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
module.exports = { isObject, spinnerStart, sleep }