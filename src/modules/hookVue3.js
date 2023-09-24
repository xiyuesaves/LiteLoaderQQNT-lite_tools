// hookVue3 功能来自 LLAPI

const elements = new WeakMap();
window.__VUE_ELEMENTS__ = elements;

function watchComponentUnmount(component) {
  if (!component.bum) component.bum = [];
  component.bum.push(() => {
    const element = component.vnode.el;
    if (element) {
      const components = elements.get(element);
      if (components?.length == 1) {
        elements.delete(element);
      } else {
        components?.splice(components.indexOf(component));
      }
      if (element.__VUE__?.length == 1) {
        element.__VUE__ = undefined;
      } else {
        element.__VUE__?.splice(element.__VUE__.indexOf(component));
      }
    }
  });
}

function watchComponentMount(component) {
  let value;
  Object.defineProperty(component.vnode, "el", {
    get() {
      return value;
    },
    set(newValue) {
      value = newValue;
      if (value) {
        recordComponent(component);
      }
    },
  });
}

function recordComponent(component) {
  let element = component.vnode.el;
  while (!(element instanceof HTMLElement)) {
    element = element.parentElement;
  }
  //将组件公开给元素的 __VUE__ 属性
  if (element.__VUE__) {
    element.__VUE__.push(component);
  } else {
    element.__VUE__ = [component];
  }

  // 添加类名指示该元素为组件-区分LLAPI
  element.classList.add("lite-tools-vue-component", "vue-component");

  //将元素映射到组件
  const components = elements.get(element);
  if (components) {
    components.push(component);
  } else {
    elements.set(element, [component]);
  }
  watchComponentUnmount(component);
}

export function hookVue3() {
  window.Proxy = new Proxy(window.Proxy, {
    construct(target, [proxyTarget, proxyHandler]) {
      const component = proxyTarget?._;
      if (component?.uid >= 0) {
        const element = component.vnode.el;
        if (element) {
          recordComponent(component);
        } else {
          watchComponentMount(component);
        }
      }
      return new target(proxyTarget, proxyHandler);
    },
  });
}