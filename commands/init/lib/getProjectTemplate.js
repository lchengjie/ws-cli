'use strict';

const request = require('@ws-cli/request')

module.exports = function() {
  return request({
    url: '/project/template'
  })
}
