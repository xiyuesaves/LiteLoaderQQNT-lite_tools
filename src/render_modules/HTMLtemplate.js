const tailElement = `<div class="ruls-item">
<div class="left-box">
  <div class="tail-opt">
    后缀内容：
    <input placeholder="后缀附加文本，留空可实现黑名单效果" spellcheck="false" class="input-text-active-show tail-context" />
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

const recallGroupItem = `<div class="filter-item"><span class="chat-type"></span><span class="peer-name"></span><span class="peer-uid"></span></div>`;
const recallTail = `<span class="tail" time=""></span>`;
const recallImgItem = `<div class="msg-img-item"><img /></div>`;
const recallMsgItem = `<div class="msg-item">
<div class="msg-box">
  <p class="user-name"></p>
  <div class="msg-content">
    <div class="msg-img-list">
    </div>
    <div class="msg-text-box">
      <p class="msg-text">
      </p>
    </div>
  </div>
</div>
</div>`;

export { tailElement, recallGroupItem, recallTail, recallImgItem, recallMsgItem };