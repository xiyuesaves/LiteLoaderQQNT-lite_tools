/**
 * markdown转换为html
 * @param {String} markdown markdown字符串
 * @returns 
 */
function simpleMarkdownToHTML(markdown) {
  const strs = markdown.split("\n");
  let ulStack = 0;
  return strs
    .map((md) => {
      // 处理标题
      md = md.replace(/^# (.*$)/gim, "<h1>$1</h1>");
      md = md.replace(/^## (.*$)/gim, "<h2>$1</h2>");
      md = md.replace(/^### (.*$)/gim, "<h3>$1</h3>");
      md = md.replace(/^#### (.*$)/gim, "<h4>$1</h4>");
      md = md.replace(/`(.*?)`/g, "<code>$1</code>");
      md = md.replace(/\n\n/g, "</p><p>");
      md = md.replace(/\n/g, "<br>");
      md = md.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');
      md = md.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
      md = md.replace(/^\s*-\s(.*)$/gim, "<li>$1</li>");
      md = md.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      md = md.replace(/\*(.*?)\*/g, "<em>$1</em>");
      if (md.includes("<li>") && ulStack) {
        md = `<ul>${md}`;
        ulStack++;
      }
      if (!md.includes("</li>") && !ulStack) {
        md = `</ul>${md}`;
        ulStack--;
      }
      return md;
    })
    .join("");
}
export { simpleMarkdownToHTML };
