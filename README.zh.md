# 侧边栏 Logo

[English](README.md) | 中文

一个 DeepSeek Harness 插件：把侧边栏左上角的 logo 按部分换成你自己的素材 —— DeepSeek 鲸鱼徽标、`deepseek` 文字标识、`HARNESS` 角标都能分别替换，编辑入口在「设置」里。内置两套预设，一点就能把整行换成 Claude Code 或 Codex。另附五个开关，把 Claude Code 的配色令牌、输入卡片、对话流、弹层与菜单、左侧栏搬过来（见「Claude 界面」）。

## 安装

仓库根目录就是插件包根目录。

```sh
# 在能调用 dsh 命令的 shell 里，指定你的 profile
dsh plugin --profile <profile> add github:cannebergeee/dsh-sidebar-logo
```

或者在 DSH 里用 GitHub 规格 `github:cannebergeee/dsh-sidebar-logo` 安装 bundle（Plugin Manager，或用 `plugin_manager` 工具的 `action: install_bundle`），然后在 **插件** 页启用。**插件 → 添加插件** 也可以安装本目录的本地副本。

## 使用

1. 打开 **设置**（侧栏底部），在分区列表里选 **侧边栏 Logo**。
2. 点一个预设，或者任意组合填写：
   - **徽标图片** —— 替代鲸鱼的方形图片，以 24 × 24 px 显示。
   - **字标图片** —— 跟在徽标后面的宽幅 logo 图片。
   - **隐藏徽标格** —— 徽标格留空、不再显示官方鲸鱼；给自带星芒的整张字标图片用。
   - **隐藏整行 logo** —— 完全不显示 logo，下面的内容整体上移（见下文）。
   - **名称** —— 徽标旁边的文字。
   - **角标** —— 名称后面的短角标，例如 `HARNESS`。
3. 上方预览会跟着改，侧栏也一起变（打字停下约 200 ms 后，或离开输入框立刻生效）。

**留空的项保持 DeepSeek 原样。** 这是逐项生效的，不是全有或全无：只填名称，鲸鱼还在；只换徽标，官方文字标识还在。当你提供的素材本身就是整张锁定版（自带星芒）时，打开 **隐藏徽标格**，否则鲸鱼会和它并排出现。

**恢复原 logo** 会清空所有字段，把原样还回来。

## 预设

两套预设一次写满所有字段。它们在预览上方，当前处在哪个配置，对应的按钮就保持高亮。

| 预设 | 写入什么 | 素材 |
| --- | --- | --- |
| **Claude Code** | 字标 = Claude Code 锁定版，角标 `ANTHROP\C`，隐藏徽标格（星芒仍存着，取消隐藏就能看到） | [assets/claude-code-logo-slate.svg](assets/claude-code-logo-slate.svg)、[assets/claude-spark-clay.svg](assets/claude-spark-clay.svg) |
| **Codex** | 徽标 = Codex 应用标记，名称 `Codex`，角标 `OPENAI` | [assets/codex-app-icon.png](assets/codex-app-icon.png) |
| **无 logo** | 什么都不显示：两格留空，顶部行收到只剩折叠按钮 | — |

OpenAI 没有公开的独立 Codex logo 文件：他们自己的 Codex 页面 `og:image` 只有纯字标，产品图标只存在于自家应用和 VS Code 扩展的安装包里。[assets/SOURCES.md](assets/SOURCES.md) 记录了每个文件的来源，也包括一起放进去的备选（`codex-mark.svg`，官方仓库里那个 `>_` 圆环）。

预设写的只是你手动也能改的那五个字段，套用之后随便改、随便清。素材以 base64 内嵌在 `client.js` 里（13 KiB），所以预设不需要选文件、也不需要联网；`assets/` 保留可读的原始文件，改完素材跑 `node tools/embed-presets.mjs` 重新生成内嵌块。

## 工作机制

插件占的是侧栏外壳专门留给品牌素材的两格：`sidebar.brand.mark` 和 `sidebar.brand.name`。这两格是单值槽，同一优先级只能有一个占用，**数字最小的那条渲染** —— 所以它以 `priority: -10` 注册，就能盖住官方在 `0` 的那条，不需要卸载或禁用任何官方插件，撤回时官方样式立刻回来。

占位是逐格、按需的：有徽标图片（或打开了 **隐藏徽标格**）才占徽标格（开关打开时那一格什么都不画），有字标图片 / 名称 / 角标才占文字格。所有字段都空且开关关闭时，插件不注册任何槽位，所以「装了什么都没做」时侧栏和官方完全一样。

这两格同时也是侧栏折叠成 56 px 轨道时用的：轨道上的展开按钮静息图形就是徽标格。这就是为什么徽标留空时要保留官方鲸鱼，而不是让按钮变成一片空白。

### 「无 logo」怎么把那行让出来

只清空两格不够：外壳仍然会留出 60 px 的品牌行。这个模式下两个占位组件会渲染一个不可见的 `[data-dsh-logo-hidden]` 标记，并附带一条以该标记为锚点的规则；规则靠**标记所在的嵌套深度**找到那一行，不依赖外壳那套带哈希的类名 —— 整行被移除，所以「新会话」和工作区列表直接顶到最上面。

这一行里的折叠按钮也会一起消失。键盘折叠依然可用：**Mod+B**（Windows 上是 `Ctrl+B`，macOS 是 `Cmd+B`，可在快捷键参考里改）。折叠成轨道后，轨道自己的展开按钮还在 —— 因为规则由「名称格」渲染，而外壳只在侧栏展开时渲染名称格。

如果将来外壳改了这层嵌套，规则就匹配不到任何东西，那一行原样留着 —— 不会误伤别的元素。

## Claude 界面（五个开关）

设置页里还有五个互相独立的开关，把 Claude Code 的五个部分搬到宿主界面上 —— 移植自 [dsh-claude-style](https://github.com/Nwflower/dsh-claude-style) 0.21.0 的配色令牌、输入卡片、对话流、弹层与菜单、左侧栏。拨动即生效，不用刷新。

| 开关 | 生效范围 |
| --- | --- |
| **配色令牌** | 陶土橙强调色 `#d97757`、纸白画布 `#ffffff`、暖中性侧栏 `#fafafa` 与三档边框；深色一套同源（`#191919` / `#1f1f1f`）。宿主用的是 `--dsw-alias-*` / `--dsw-specific-*` 别名令牌，所以一处改动会连画布、侧栏、边框、链接、行内代码、用户气泡一起变。 |
| **输入卡片** | 输入框卡片：18 px 圆角、1 px 描边、柔和投影；聚焦时描边加深并加一圈光晕。新建会话保持 86 px 高，对话里随内容长高。 |
| **对话流** | 正文节奏与 markdown 材质：段距 12 px、标题 24/12 px 节奏、代码块 12 px 圆角描边、行内代码 chip、表头底色、引用块、`hr` 与链接。 |
| **弹层与菜单** | 菜单、下拉与弹层卡片只改几何：12 px 圆角、6 px 内距、行高收到 32 px、行圆角 6 px、13/20 字号；对话框 16 px、工具提示 6 px。**颜色不归它管** —— 卡片填充由「配色令牌」提供（`--dsw-menu-surface-fill`），配色关掉时菜单保持官方 `MenuSurface` 材质原样。 |
| **左侧栏** | 会话行、项目行与面板行收到 28 px 高、6 px 内距、6 px 圆角，标签间距 6→4 px，会话标题 13/18 且静息用次级墨色、悬停/选中转主墨色，行尾动作间距 6 px。 |

实现要点：五段样式共用一个 `<style>`，分别挂在 `body[data-dsh-logo-tokens]` / `-composer` / `-chat` / `-popover` / `-sidebar` 之下 —— 开关关掉时那一段**匹配不到任何元素**，不是被覆盖、也不是被隐藏。选择器只认宿主已经公开的语义钩子：`[data-composer-card]`、`[data-composer-input]`、`[data-phase]`、`[data-chat-flow]`、`.md-code-block`、`[role="menu"]` / `[role="menuitem"]`，以及侧栏那一族 camelCase 类名局部名（`sessionRow` / `projectRow` / `panelRow`）与 `--dsh-sidebar-*` 行度量变量 —— 不用模块哈希，宿主改版最多让某条规则失配，不会误伤别的元素。

**三款 Anthropic 字体没有随包发布**（不可再分发），所以这一层搬的是配色与几何，字体仍用宿主自己的。

⚠️ 别和整套主题插件（例如 `dsh-claude-style`）同时开：两者抢同一批令牌，谁后加载谁赢。

## 限制

- **配置只存在当前浏览器。** 存在 `localStorage` 的 `dsh.sidebar-logo.v1` 下（五个样式开关也在这个键里），换浏览器或换 profile 就回到官方 logo 与官方样式。这是纯展示配置，不进会话、不进模型请求。浏览器拒绝写入时，页面会明确提示"无法保存"，而不是假装成功。
- **图片是内嵌的，不走文件路径。** 选中的位图会在页面里缩放（徽标 96 px，字标高 96 px、宽最多 640 px）后存成 `data:` URL；SVG 保留矢量，上限 256 KB。
- **名称和角标是纯文字。** 它们跟随侧栏的墨色，所以浅色/深色主题都正常；徽标和字标保留自己的颜色。侧栏变窄时名称会省略号截断，角标有宽度上限，不会顶出这一行。
- **折叠轨道只显示徽标**，因为外壳在折叠时只渲染那一格。
- **「无 logo」会把那一行连同折叠按钮一起移除**：这个模式下用 `Mod+B` 折叠侧栏；折叠后轨道仍有自己的展开按钮。
- **预设里带的是别家的标识。** 它们分别是 Anthropic 和 OpenAI 的商标，只用来标明预设对应的工具 —— 见下面的商标说明。

## 商标

[`assets/`](assets/) 下的文件由 Anthropic 和 OpenAI 发布，**不在本仓库 MIT 许可证的范围内**。把它们放进来只是为了让预设能显示一个可辨认的对应标识；没有任何重绘，Codex 的浅色版只改了描边颜色。来源、哈希和适用规则见 [assets/SOURCES.md](assets/SOURCES.md)。

本项目与 Anthropic、OpenAI 无隶属、背书或赞助关系。两家的品牌规范都禁止任何让人误以为存在背书、或把其标识用作你自有产品名称/logo 的用法。

## 文件

| 文件 | 作用 |
| --- | --- |
| `package.json` | bundle 清单：patch、Client 声明、exports、图标。 |
| `cordis.patch.yml` | 插入 `sidebar-logo` 这条 Loader 条目。 |
| `index.js` | Host 半边；不 import 任何包，不注册任何东西。 |
| `client.js` | 品牌位、设置页、预设、存储、词典，以及五套 Claude 样式（令牌 / 输入卡片 / 对话流 / 弹层 / 侧栏）与它们的开关。 |
| `locale/*.json` | Plugin Manager 里的标题和描述。 |
| `icon.svg` | 插件图标。 |
| `assets/` | 预设用的品牌素材，附来源与商标说明。 |
| `tools/embed-presets.mjs` | 重新生成 `client.js` 里的内嵌素材。 |

## 许可证

插件代码为 MIT —— 见 [LICENSE](LICENSE)。`assets/` 下的素材不在该授权范围内。
