// hookVue3 功能来自 LLAPI
const elements = new WeakMap();

/**
 *
 * @param {Element} component
 */
function watchComponentUnmount(component) {
  if (!component.bum) {
    component.bum = [];
  }
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
    // Call functions in __VUE_UNMOUNT__ when component unmounts
    window.__VUE_UNMOUNT__.forEach((func) => {
      try {
        func(component);
      } catch (e) {
        console.error(e);
      }
    });
  });
}

/**
 *
 * @param {Element} component
 */
function watchComponentMount(component) {
  let value;
  Object.defineProperty(component.vnode, "el", {
    get() {
      return value;
    },
    set(newValue) {
      if (value !== newValue) {
        value = newValue;
        recordComponent(component);
      }
    },
  });
}

/**
 *
 * @param {Element} component
 */
function recordComponent(component) {
  let element = component.vnode.el;
  while (!(element instanceof HTMLElement) && element) {
    element = element?.parentElement;
  }
  if (!element) {
    return;
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
  // Call functions in __VUE_MOUNT__ when component found
  window.__VUE_MOUNT__.forEach((func) => {
    try {
      func(component);
    } catch (e) {
      console.error(e);
    }
  });
}

/**
 * 将Vue组件实例挂载到对应元素上
 */
if (!window.isProxyProxy) {
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

  // 初始化全局变量
  window.__VUE_ELEMENTS__ = elements;
  window.__VUE_MOUNT__ = []; // Functions to call when component found ((component) => {})
  window.__VUE_UNMOUNT__ = []; // Functions to call when component unmounts ((component) => {})
  window.isProxyProxy = true;
}
