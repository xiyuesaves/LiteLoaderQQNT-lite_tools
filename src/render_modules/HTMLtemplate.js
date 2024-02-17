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
    <input placeholder="留空为全局匹配，多个匹配项用“,”隔开" spellcheck="false" class="input-text-active-show rule-group-list" />
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

const localEmoticonsHTML = `<div class="full-screen-preview">
<img src="" />
</div>
<div class="commonly-emoticons-panel"><div class="folder-list-commonly"></div></div>
<div class="lite-tools-local-emoticons-main">
  <div class="context-menu">
    <a class="context-menu-item delete-from-commonly">
      <span class="context-menu-item__text">历史表情中删除</span>
    </a>
    <a class="context-menu-item open-folder">
      <span class="context-menu-item__text">打开表情文件夹</span>
    </a>
    <a class="context-menu-item open-file">
      <span class="context-menu-item__text">图片查看器打开</span>
    </a>
  </div>
  <div class="folder-list"></div>
  <div class="folder-icon-list">
    <div class="folder-scroll"></div>
  </div>
</div>`;

const messageTailTips = `<p title="%title%" class="lite-tools-tail-tips">%s%</p>`;

const subMenuIconEl = `<div class="q-context-menu-item__icon icon_next lite-tools-context-next-icon">
<i class="q-icon">
  <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M5.6953 3L10.7993 8.10522L5.6953 13.2104L5 12.5161L9.4098 8.10522L5 3.69439L5.6953 3Z"
    ></path>
  </svg>
</i>
</div>`;

export { tailElement, recallGroupItem, recallTail, recallImgItem, recallMsgItem, localEmoticonsHTML, messageTailTips, subMenuIconEl };
