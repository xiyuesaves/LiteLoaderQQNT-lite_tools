// 首次执行检测，只有第一次执行时返回true
let set = new Set();

const first = (() => {
  return (tag) => {
    return !set.has(tag) && !!set.add(tag);
  };
})();
function refresh(key) {
  set.delete(key)
}
export { first, refresh };
