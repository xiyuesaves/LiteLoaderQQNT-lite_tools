import { options } from "./options.js";

const logList = [];

window.logs = () => {
  if (options.debug) {
    logList.forEach((el) => {
      console.log(`[${el.name}]`, ...el.log);
    });
  } else {
    console.log("当前没有启用debug");
  }
};

class logs {
  constructor(moduleName) {
    this.moduleName = moduleName;
    this.log = (...args) => {
      console.log(`[${this.moduleName}]`, ...args);
      // 没有开启debug开关的情况下，阻止保存log数据
      if (options.debug) {
        logList.push({
          name: this.moduleName,
          log: [...args],
        });
      }
    };
  }
}

export { logs };
