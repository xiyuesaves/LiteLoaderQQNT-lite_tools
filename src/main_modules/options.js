let options = {};
const callFunSet = new Set();
const beforeCallFunSet = new Set();

function setOptions(opt) {
  beforeCallFunSet.forEach((callback) => callback(opt));
  options = opt;
  callFunSet.forEach((callback) => callback(opt));
}

function getOptions() {
  return options;
}

function onUpdateOptions(callback) {
  callFunSet.add(callback);
}

function offUpdateOptions(callback) {
  callFunSet.delete(callback);
}

function onBeforeUpdateOptions(callback) {
  beforeCallFunSet.add(callback);
}

function offBeforeUpdateOptions(callback) {
  beforeCallFunSet.delete(callback);
}

module.exports = {
  setOptions,
  getOptions,
  onBeforeUpdateOptions,
  offBeforeUpdateOptions,
  onUpdateOptions,
  offUpdateOptions,
};
