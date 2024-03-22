// 判断今天是不是四月一号
function isToday() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  return month === 4 && day === 1;
}

if (isToday() || true) {
  document.querySelectorAll(".nav-item.liteloader").forEach((node) => {
    if (node.textContent === "轻量工具箱") {
      node.querySelector(".name").innerHTML = "超重工具箱";
      node.querySelector(".q-icon").innerHTML = pluginIcon;
    }
  });
}
