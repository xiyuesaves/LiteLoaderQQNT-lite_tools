import { options } from "./options.js";
import { switchButtons } from "./eggs.js";

/**
 * 初始化设置界面监听方法
 * @param {Element} viewEl 插件设置界面容器
 * @returns
 */
function SwitchEventlistener(viewEl) {
  const view = viewEl;

  /**
   *
   * @param {String} optionKey 设置对象key路径
   * @param {String|Element} switchClass 设置界面class选择器或元素
   * @param {Function} callback 回调函数 Event,Boolend
   */
  function addSwitchEventlistener(optionKey, element, callback) {
    const option = Function("options", `return options.${optionKey}`)(options);
    let target;
    if (typeof element === "string") {
      target = view.querySelector(element);
    } else {
      target = element;
    }
    if (option) {
      target.classList.add("is-active");
    } else {
      target.classList.remove("is-active");
    }
    // 初始化时执行一次callback方法
    if (callback) {
      callback(null, option);
    }
    target.addEventListener("click", function (event) {
      this.classList.toggle("is-active");
      let newOptions = Object.assign(
        options,
        Function("options", `options.${optionKey} = ${this.classList.contains("is-active")}; return options`)(options),
      );
      lite_tools.setOptions(newOptions);
      if (callback) {
        callback(event, this.classList.contains("is-active"));
      }
      switchButtons();
    });
  }
  return addSwitchEventlistener;
}

export { SwitchEventlistener };
