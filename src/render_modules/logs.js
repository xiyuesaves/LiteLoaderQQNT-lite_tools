const logList = [];

window.logs = () => {
  logList.forEach((el) => {
    console.log(`[${el.name}]`, ...el.log);
  });
};

class logs {
  constructor(moduleName) {
    this.moduleName = moduleName;
    this.log = (...args) => {
      console.log(`[${this.moduleName}]`, ...args);
      logList.push({
        name: this.moduleName,
        log: [...args],
      });
    };
  }
}

export { logs };
