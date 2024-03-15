import { toastContentEl, toastEl, defaultIcon, successIcon, errorIcon } from "./HTMLtemplate.js";

const toastContent = createToastContentEl(toastContentEl);

const domparser = new DOMParser();

function createToastContentEl(HTMLtemplate) {
  document.body.insertAdjacentHTML("beforeend", HTMLtemplate);
  return document.querySelector(".lite-tools-toast");
}
function showToast(content, type, duration) {
  const toast = createToastEl(content, type);
  toastContent.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("lite-tools-toast-show");
  });
  setTimeout(() => {
    toast.addEventListener(
      "transitionend",
      () => {
        toast.remove();
      },
      { once: true },
    );
    toast.classList.remove("lite-tools-toast-show");
  }, duration);
}

function createToastEl(content, type) {
  const newToastEl = toastEl.replace("{{content}}", content).replace("{{icon}}", getIcon(type));
  return domparser.parseFromString(newToastEl, "text/html").querySelector(".lite-tools-toast-item");
}

function getIcon(type) {
  switch (type) {
    case "success":
      return successIcon;
    case "error":
      return errorIcon;
    default:
      return defaultIcon;
  }
}
export { showToast };
