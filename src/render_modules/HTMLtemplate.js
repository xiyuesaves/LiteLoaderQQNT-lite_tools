const tailElement = `<div class="ruls-item">
<div class="left-box">
  <div class="tail-opt">
    后缀内容：
    <input placeholder="后缀附加文本" spellcheck="false" class="input-text-active-show tail-context" />
  </div>
  <div class="tail-opt">
    是否换行：
    <div class="msg-tail-newline q-switch">
      <span class="q-switch__handle"></span>
    </div>
  </div>
  <div class="tail-opt">
    匹配群组：
    <input placeholder="留空为全局匹配，多个群用“,”隔开" spellcheck="false" class="input-text-active-show rule-group-list" />
  </div>
</div>
<div class="ruls-control">
  <div class="to-up"></div>
  <div class="delete"></div>
  <div class="to-down"></div>
</div>
</div>`;

export { tailElement };
