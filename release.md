### 新增

- `插件配置>代理地址` 配置项，该配置影响 `检查更新`，`插件自更新`，`链接预览` 等功能

### 修复

- `动态编译scss` 功能会重复监听文件的问题

### 调整

- 优化 `本地表情>历史表情` 数据更新频率

> [!NOTE]
> 目前可以通过 `插件配置>自定义rkey获取地址` 功能来使阻止撤回和图片搜索功能恢复正常，前提是需要用户自行搭建此服务，\
> 该功能依赖于 [Lagrange.Core](https://github.com/linyuchen/Lagrange.Core) 的 [get_rkey](https://github.com/linyuchen/Lagrange.Core/blob/dca7d569d0dd05d3f031e8cd5893bb2d1bfab65d/Lagrange.OneBot/Core/Operation/Generic/FetchRkeyOperation.cs#L8) 接口，\
> 可重写此接口并在返回中添加 `expired_time` 属性用于避免频繁更新 \
> 针对此功能的逻辑在 [getRkey.js](https://github.com/xiyuesaves/LiteLoaderQQNT-lite_tools/blob/v4/src/main_modules/getRkey.js) 中
