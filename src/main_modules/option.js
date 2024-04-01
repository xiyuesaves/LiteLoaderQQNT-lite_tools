const EventEmitter = require("events");
const { join } = require("path");
const { existsSync, mkdirSync } = require("fs");
const defaultConfig = require("../defaultConfig/defaultConfig.json");
const loadOptions = require("./loadOptions");
const pluginDataPath = LiteLoader.plugins.lite_tools.path.data;
const settingsPath = join(pluginDataPath, "settings.json");
if (!existsSync(pluginDataPath)) {
  mkdirSync(pluginDataPath, { recursive: true });
}
const options = loadOptions(defaultConfig, settingsPath);

/**
 * 配置管理类
 */
class Options extends EventEmitter {
  constructor(options) {
    super();
    this._options = options;
    this.handler = {
      get: (target, key, receiver) => {
        const desc = Object.getOwnPropertyDescriptor(target, key);
        const value = Reflect.get(target, key, receiver);
        if (desc && !desc.writable && !desc.configurable) {
          return Reflect.get(target, key, receiver);
        }
        if (typeof value === "object" && value !== null) {
          return new Proxy(target[key], this.handler);
        }
        return Reflect.get(target, key, receiver);
      },
      set: (target, key, value, receiver) => {
        const setValue = Reflect.set(target, key, value, receiver);
        this.emit("update", this._proxyOptions);
        return setValue;
      },
    };
    this._proxyOptions = new Proxy(this._options, this.handler);
  }
  get value() {
    return this._proxyOptions;
  }
  updateOptions(newOpt) {
    this._options = newOpt;
    this._proxyOptions = new Proxy(this._options, this.handler);
    this.emit("update", this._proxyOptions);
  }
}

module.exports = new Options(options);
