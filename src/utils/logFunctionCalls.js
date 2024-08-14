// 输出调用参数
const temp = document.querySelector(".ml-area.v-list-area").__VUE__[0].exposed
for (const key in temp) {
  if (Object.prototype.hasOwnProperty.call(temp, key)) {
    if(typeof temp[key] === "function"){
      const value = temp[key]
      temp[key] = function(...args){
        console.log(key, ...args)
        return value.call(this, ...args)
      }
    }
  }
}