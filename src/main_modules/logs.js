class logs {
  constructor(moduleName) {
    this.moduleName = moduleName;
    this.log = (...args) => {
      console.log(`\x1B[32m[轻量工具箱]${this.moduleName}> \x1B[0m`, ...args);
    };
  }
}

exports.logs = logs;
