const { ServiceStateManager } = require('@dojot/microservice-sdk');
const { getConfig, transformObjectKeys } = require('@dojot/microservice-sdk/lib/configManager');
const { camelCase } = require('lodash');

class StateManager {
  constructor() {
    const { lightship } = getConfig('DOJOT_ACL');
    const serviceConf = { lightship: transformObjectKeys(lightship, camelCase) };
    this.serviceStateManager = new ServiceStateManager(serviceConf);
    this.serviceStateManager.registerService('kafka');
    this.serviceStateManager.registerService('redis');
  }
}

module.exports = new StateManager().serviceStateManager;
