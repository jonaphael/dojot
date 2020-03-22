const fs = require('fs');
const async = require('async');
const mqtt = require('mqtt');
const { logger } = require('@dojot/dojot-module-logger');
const defaultConfig = require('./config');

const TAG = { filename: 'MqttClient' };

/**
 * BackPressure
 */
const PARALLEL_HANDLERS = 1;
const MAX_QUEUE_LENGTH = 1000;

class MQTTClient {
  constructor(agentMessenger, config) {
    this.config = config || defaultConfig;
    this.isConnected = false;

    this.clientId = this.config.mqtt.clientId;
    this.host = this.config.mqtt.host;
    this.hostname = this.config.app.hostname;
    this.keepAlive = this.config.mqtt.keepAlive;
    this.port = this.config.mqtt.port;
    this.username = this.config.mqtt.clientUsername;
    this.secureMode = this.config.mqtt.secure;

    this.privateKey = fs.readFileSync(`${this.config.mqtt.tls.privateKey.location}`);
    this.clientCrt = fs.readFileSync(`${this.config.mqtt.tls.certificate.location}`);
    this.ca = fs.readFileSync(`${this.config.mqtt.tls.ca.location}`);

    // backPressure
    this.messageQueue = null;
    this.currentMessageQueueLenght = 0;

    // agent messenger
    this.agentMessenger = agentMessenger;
  }

  init() {
    this.mqttOptions = {
      username: this.username,
      clientId: this.clientId,
      host: this.host,
      port: this.port,
      protocol: this.secureMode ? 'mqtts' : 'mqtt',
      ca: this.ca,
      key: this.privateKey,
      cert: this.clientCrt,
      keepAlive: this.keepAlive,
      clean: false,
      rejectUnauthorized: false,
    };

    const onConnectBind = this.onConnect.bind(this);
    const onDisconnectBind = this.onDisconnect.bind(this);
    const onMessageBind = this.onMessage.bind(this);

    this.connect();
    this.mqttc.on('connect', onConnectBind);
    this.mqttc.on('disconnect', onDisconnectBind);
    this.mqttc.on('message', onMessageBind);

    /**
     * Create async queue
     */
    this.messageQueue = async.queue((data, done) => {
      this.asyncQueueWorker(data);
      done();
    }, PARALLEL_HANDLERS);

    /**
     * When processing was finalized, reconnect to broker
     */
    this.messageQueue.drain(() => {
      if (this.isConnected === false) {
        this.mqttc.reconnect();
      }
    });
  }

  onConnect() {
    this.isConnected = true;
    logger.info(`Client ${this.clientId} connected successfully!`, TAG);
    this.subscribe();
  }

  onDisconnect() {
    logger.info(`Client ${this.clientId} disconnected, reconnecting ......`);
    this.isConnected = false;
    this.mqttc.reconnect();
  }

  onMessage(topic, message) {
    // pause
    if (this.currentMessageQueueLenght > MAX_QUEUE_LENGTH) {
      this.mqttc.end(true);
      this.isConnected = false;
      return;
    }

    if (this.isConnected) {
      this.currentMessageQueueLenght += 1;
      const data = { topic, message };
      this.messageQueue.push(data, () => {
        this.currentMessageQueueLenght -= 1;
      });
    }
  }

  connect() {
    if (this.isConnected === false) {
      this.mqttc = mqtt.connect(this.mqttOptions);
    }
  }

  subscribe() {
    logger.info(`Subscribing to topic ${this.config.mqtt.subscribeTopic}`, TAG);
    if (this.isConnected === true) {
      this.mqttc.subscribe(this.config.mqtt.subscribeTopic, { qos: this.config.mqtt.subscribeQos });
    }
  }

  asyncQueueWorker(data) {
    const { topic, message } = data;
    this.agentMessenger.sendMessage(topic, message);
  }
}

module.exports = MQTTClient;
