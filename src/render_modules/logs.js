const logList = [];

window.logs = () => {
  logList.forEach((el) => {
    console.log(`${el.name}`, ...el.log);
  });
};

function logs(moduleName) {
  return new NewLogs(moduleName);
}

class NewLogs {
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
