// 首次执行检测，只有第一次执行时返回true
const first = (() => {
  const set = new Set();
  return (tag) => {
    return !set.has(tag) && !!set.add(tag);
  };
})();

export { first };
