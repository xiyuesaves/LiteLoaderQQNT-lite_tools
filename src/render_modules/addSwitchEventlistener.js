// 初始化设置界面监听方法
let view, options;

function addSwitchEventlistener(optionKey, switchClass, callback) {
  const option = Function("options", `return options.${optionKey}`)(options);
  if (option) {
    view.querySelector(switchClass).classList.add("is-active");
  } else {
    view.querySelector(switchClass).classList.remove("is-active");
  }
  // 初始化时执行一次callback方法
  if (callback) {
    callback(null, option);
  }
  view.querySelector(switchClass).addEventListener("click", function (event) {
    this.classList.toggle("is-active");
    let newOptions = Object.assign(options, Function("options", `options.${optionKey} = ${this.classList.contains("is-active")}; return options`)(options));
    lite_tools.setOptions(newOptions);
    if (callback) {
      callback(event, this.classList.contains("is-active"));
    }
  });
}

// 初始化方法
async function SwitchEventlistener(viewEl) {
  const { opt } = await import("./options.js");
  options = opt;
  view = viewEl;
  return addSwitchEventlistener;
}

export { SwitchEventlistener };
