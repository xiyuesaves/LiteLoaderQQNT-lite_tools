import { tailElement } from "./HTMLtemplate.js";
import { deleteIcon, foldIcon } from "./svg.js";
import { options } from "./options.js";
import { debounce } from "./debounce.js";
// 配置界面日志
import { logs } from "./logs.js";
const log = new logs("后缀实例").log;

class TailList {
  constructor(view, tailList) {
    log("开始初始化");
    this.list = tailList;
    this.ElementList = []; // 元素列表
    this.viewEl = view;
    this.parser = new DOMParser();
    this.init();
  }
  createNewTail() {
    this.list.unshift({
      id: crypto.randomUUID(),
      newLine: false,
      filter: [""],
      content: "",
    });
    const tailEl = this.newTail(this.list[0]);
    this.ElementList.unshift(tailEl);
    this.updateDom();
    this.updateOption();
  }
  init() {
    log("创建元素", this.list);
    for (let i = 0; i < this.list.length; i++) {
      const tail = this.list[i];
      const tailEl = this.newTail(tail);
      this.ElementList.push(tailEl);
    }
    this.updateDom();
  }
  updateDom() {
    log("更新页面元素", this.ElementList);
    this.ElementList.forEach((el) => {
      this.viewEl.appendChild(el);
    });
  }
  newTail(tail) {
    const tailEl = this.parser.parseFromString(tailElement, "text/html").querySelector(".ruls-item");
    const deleteEl = tailEl.querySelector(".delete");
    const toUpEl = tailEl.querySelector(".to-up");
    const toDownEl = tailEl.querySelector(".to-down");
    const tailContext = tailEl.querySelector(".tail-context");
    const ruleGroupList = tailEl.querySelector(".rule-group-list");
    const msgTailNewline = tailEl.querySelector(".msg-tail-newline");

    deleteEl.innerHTML = deleteIcon;
    toUpEl.innerHTML = foldIcon;
    toDownEl.innerHTML = foldIcon;
    deleteEl.addEventListener("click", () => this.deleteThis(tail.id));
    toUpEl.addEventListener("click", () => this.rearrangeItem(tail.id, -1));
    toDownEl.addEventListener("click", () => this.rearrangeItem(tail.id, 1));

    tailContext.value = tail.content;
    ruleGroupList.value = tail.filter.join(",");
    msgTailNewline.classList.toggle("is-active", tail.newLine);

    // 监听换行开关
    msgTailNewline.addEventListener("click", () => {
      tail.newLine = !tail.newLine;
      msgTailNewline.classList.toggle("is-active", tail.newLine);
      this.updateOption();
    });
    // 监听后缀内容修改
    tailContext.addEventListener(
      "input",
      debounce(() => {
        tail.content = tailContext.value;
        this.updateOption();
      }, 100),
    );
    // 监听过滤群组修改
    ruleGroupList.addEventListener(
      "input",
      debounce(() => {
        tail.filter = ruleGroupList.value.split(",");
        this.updateOption();
      }, 100),
    );
    log("返回元素", tailEl);
    return tailEl;
  }
  deleteThis(id) {
    log("删除此数据", id);
    const deleteIndex = this.list.findIndex((tail) => tail.id === id);
    if (deleteIndex !== -1) {
      this.list.splice(deleteIndex, 1);
      const deleteEl = this.ElementList.splice(deleteIndex, 1);
      deleteEl[0].remove();
    }
    this.updateOption();
  }
  rearrangeItem(id, offset) {
    const moveIndex = this.list.findIndex((tail) => tail.id === id);
    const targetIndex = moveIndex + offset;
    if (targetIndex >= 0) {
      [this.list[moveIndex], this.list[targetIndex]] = [this.list[targetIndex], this.list[moveIndex]];
      [this.ElementList[moveIndex], this.ElementList[targetIndex]] = [this.ElementList[targetIndex], this.ElementList[moveIndex]];
      this.updateDom();
      this.updateOption();
    }
  }
  updateOption() {
    log("更新options");
    options.tail.list = this.list;
    lite_tools.setOptions(options);
  }
}

export { TailList };
