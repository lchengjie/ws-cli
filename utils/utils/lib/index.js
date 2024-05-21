'use strict';

function isObject(o) {
  // console.log("🚀 ~ isObject ~ Object.prototype.toString(o):", Object.prototype.toString.call(o) === "[object Object]")
  return Object.prototype.toString.call(o) === '[object Object]'
}

module.exports = { isObject }