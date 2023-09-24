// 向设置界面插入动态选项
async function addOptionLi(list, element, objKey, key) {
  const { options } = await import("./options.js");
  list.forEach((el, index) => {
    const hr = document.createElement("hr");
    hr.classList.add("horizontal-dividing-line");
    const li = document.createElement("li");
    li.classList.add("vertical-list-item");
    const switchEl = document.createElement("div");
    switchEl.classList.add("q-switch");
    if (!el[key]) {
      switchEl.classList.add("is-active");
    }
    switchEl.setAttribute("index", index);
    switchEl.addEventListener("click", function () {
      Function("options", `options.${objKey}[${index}].${key} = ${this.classList.contains("is-active")}`)(options);
      this.classList.toggle("is-active");
      lite_tools.setOptions(options);
    });
    const span = document.createElement("span");
    span.classList.add("q-switch__handle");
    switchEl.appendChild(span);
    const title = document.createElement("h2");
    title.innerText = el.name;
    li.append(title, switchEl);
    element.append(hr, li);
  });
}

export { addOptionLi };
