/**
 * 自定义limitMap，在达到指定数量后清空最后一条记录
 */
class LimitedMap {
  constructor(limit) {
    this.limit = limit;
    this.map = new Map();
    this.keys = [];
  }
  set(key, value) {
    // 如果当前map存储消息超过指定大小，则删除最后一条数据
    if (this.map.size >= this.limit) {
      const oldestKey = this.keys.shift();
      this.map.delete(oldestKey);
    }
    this.map.set(key, value);
    this.keys.push(key);
  }
  get(key) {
    return this.map.get(key);
  }
  has(key) {
    return this.map.has(key);
  }
  toArray() {
    return Array.from(this.map);
  }
  delete(key) {
    const index = this.keys.indexOf(key);
    if (index !== -1) {
      this.keys.splice(index, 1);
    }
    this.map.delete(key);
  }
}
module.exports = LimitedMap;
