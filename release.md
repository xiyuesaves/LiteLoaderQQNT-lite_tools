

> [!NOTE]
> 目前可以通过 `插件配置>自定义rkey获取地址` 功能来使阻止撤回和图片搜索功能恢复正常，前提是需要用户自行搭建此服务，\
> 该功能依赖于 [Lagrange.Core](https://github.com/linyuchen/Lagrange.Core) 的 [get_rkey](https://github.com/linyuchen/Lagrange.Core/blob/dca7d569d0dd05d3f031e8cd5893bb2d1bfab65d/Lagrange.OneBot/Core/Operation/Generic/FetchRkeyOperation.cs#L8) 接口，\
> 可在请求返回中添加 `expired_time` 属性用于避免频繁更新 \
> 针对此功能的逻辑在 [getRkey.js](https://github.com/xiyuesaves/LiteLoaderQQNT-lite_tools/blob/v4/src/main_modules/getRkey.js) 模块中
