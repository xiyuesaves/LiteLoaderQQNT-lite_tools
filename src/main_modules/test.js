const { LimitedMap } = require("./LimitedMap");

const a = {
  test: new LimitedMap(50),
};
console.log(JSON.stringify(a));
