import { options } from "./options.js";

const logList = [];

window.LT_logs = () => {
  if (options.debug.console) {
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
    if (options.debug.console) {
      this.log = (...args) => {
        console.log(`[${this.moduleName}]`, ...args);
        // lite_tools.log(`[${this.moduleName}]`, ...args);
        // 没有开启debug开关的情况下，阻止保存log数据
        logList.push({
          name: this.moduleName,
          log: [...args],
        });
      };
    } else {
      this.log = () => {};
    }
  }
}

export { logs };
