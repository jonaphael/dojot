const hostName = process.env.HOSTNAME || 'v2k-bridge-verne';
const unsecuredMode = (mode) => ((mode || false) && (mode.toString().toLowerCase().trim() === 'true' || Number(mode) > 0));

const app = {
  mqttLogLevel: process.env.LOG_LEVEL || 'debug',
  baseDir: process.env.BASE_DIR || '/opt/v2k-verne',
  hostname: hostName,
};

const mqtt = {
  clientUsername: process.env.V2K_MQTT_USERNAME || 'v2k-bridge-verne',
  clientId: process.env.V2K_MQTT_CLIENT_ID || hostName,
  host: process.env.V2K_MQTT_HOST || '10.202.70.79',
  port: parseInt(process.env.V2K_MQTT_PORT, 0) || 1883,
  keepalive: parseInt(process.env.V2K_MQTT_KEEPALIVE, 0) || 60,
  secure: unsecuredMode(process.env.V2K_MQTT_SECURE),
  // eslint-disable-next-line no-useless-escape
  subscribeTopic: process.env.V2K_MQTT_SUBSCRIPTION_TOPIC || '\$share/group/+/attrs',
  subscribeQos: parseInt(process.env.V2K_MQTT_SUBSCRIPTION_QOS, 0) || 1,
  tls: {
    ca: {
      location: process.env.V2K_MQTT_CA_FILE || `${app.baseDir}/app/cert/ca.crt`,
    },
    certificate: {
      location: process.env.V2K_MQTT_CERT_FILE || `${app.baseDir}/app/cert/${hostName}.crt`,
    },
    privateKey: {
      location: process.env.V2K_MQTT_KET_FILE || `${app.baseDir}/app/cert/${hostName}.key`,
    },
  },
};

module.exports = { app, mqtt, unsecuredMode };
