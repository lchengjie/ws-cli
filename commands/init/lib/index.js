'use strict';

const Command = require('@ws-cli/command')
const log = require('@ws-cli/log')

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
}

function init(argv) {
  console.log('init ', argv)
  return new InitCommand(argv)
}

module.exports = init
module.exports.InitCommand = InitCommand

