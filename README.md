# wuyu

本地工作台集合：把两个可运行的小站收进同一个仓库，**文件全部落地为本地可编辑内容**（不是只读外链或 iframe），根目录 `index.html` 是导航门户。

> 当前选择：先只提交源码到 `main`，**暂不开启 GitHub Pages**；在本地修改、预览、继续提交即可。

## 目录结构

```
.
├── 启动门户.bat / 启动-提示词助手.bat / 启动-句读工作台.bat  # 双击即用的本地启动入口
├── serve.ps1                  # 零依赖本地静态服务器（启动器本体，Windows 自带 PowerShell 运行）
├── index.html                 # 根导航门户（两张卡片进入两个小站）
├── prompt/                    # 提示词助手 Prompt Workbench（明文源码，最好改）
│   ├── index.html             # 页面结构与可见文案
│   ├── style.css              # 配色、布局、样式
│   ├── app.mjs                # 界面交互逻辑
│   ├── core.mjs               # 场景库、追问规则、提示词模板（改内容重点看这里）
│   ├── attachments.mjs        # 附件读取流程（纯文本直读）
│   ├── speech.mjs             # 浏览器语音输入
│   ├── document-parser.mjs   # Office/PDF 解析参考源码（高级，见下方限制）
│   └── favicon.svg
└── judou/                     # 句读 JUDOU · 多平台文案工作台（静态成品）
    ├── index.html             # 标题、描述、入口引用
    ├── assets/                # 打包后的 js/css + 配图 *.jpg
    ├── fonts/                 # 网页字体
    └── .nojekyll
```

## 怎么在自己电脑上打开使用

子站用了浏览器模块（ES Module），直接双击 HTML 文件会被浏览器安全策略拦截脚本，所以**用仓库自带的启动器起一个本地小服务**即可，不需要安装 Node 或 Python。

### 最快：双击启动（Windows）
在仓库根目录双击对应文件，会自动弹出服务窗口并用默认浏览器打开：

| 想打开 | 双击哪个文件 |
|---|---|
| 两个应用的总门户（再点卡片进入） | `启动门户.bat` |
| 只打开「提示词助手」 | `启动-提示词助手.bat` |
| 只打开「句读工作台」 | `启动-句读工作台.bat` |

- 启动后浏览器地址类似 `http://127.0.0.1:8099/`；若 8099 被占用会自动换端口，以黑色窗口里打印的地址为准。
- 用完直接**关闭那个黑色窗口**，服务即停止，不会常驻后台。
- 启动器本体是 `serve.ps1`（Windows 自带 PowerShell 运行的零依赖静态服务器），三个 `.bat` 只是它的快捷入口。

### 备选方式（电脑已装相应工具时）
- Node：仓库根目录执行 `npx serve .` 或 `npx http-server -p 8080`
- VS Code：装 **Live Server** 插件，右键 `index.html` → Open with Live Server
- Python：`python -m http.server 8080`

打开后从门户进入，或直接访问 `/prompt/`、`/judou/`。

## 哪里可以改（重点）

### 1. `prompt/` 提示词助手 —— 明文源码，直接改

| 想改什么 | 改哪个文件 |
|---|---|
| 顶部标题、按钮、说明文字、弹窗文案 | `prompt/index.html` |
| 四个场景（报表分析 / 文档写作 / PPT 制作 / 检索摘要）的名称、示例、引导要求 | `prompt/core.mjs` 顶部的 `categories` |
| 追问什么时候出现、给出哪些选项 | `prompt/core.mjs` 的 `nextQuestion()` |
| 最终提示词的章节结构、模板措辞、固定要求 | `prompt/core.mjs` 的 `composePreview()` |
| 颜色、间距、排版 | `prompt/style.css` |
| 点击、提交、复制、下载等交互 | `prompt/app.mjs` |

改完保存，刷新浏览器即可看到效果（走本地服务器时无缓存问题）。

### 2. `judou/` 句读 —— 静态成品，按改动难度分层

- **容易改**：`judou/index.html` 里的网页标题 `title`、描述 `meta description`；`judou/assets/` 下的配图（`citrus-table.jpg`、`green-orchard.jpg`、`plum-fruit.jpg`、`plum-soda.jpg`、`slow-morning.jpg`、`summer-drink.jpg`）**同名替换**即可保持引用不变。
- **不建议手改**：`judou/assets/index-CfY9XuKg.js`、`index-BeoRn2gJ.js`、`index-LppVb9Hi.css` 是构建压缩后的打包产物，变量被压缩、内容挤在单行里，逐行修改容易出错；若要改界面文案或交互逻辑，需要拿到它的前端源码工程重新构建，而不是直接改压缩文件。
- `judou/assets/CREDITS.md` 保留了上游素材/版权来源说明。

## 为适应子目录已做的适配

把句读放进 `judou/` 子目录时，原始静态资源写的是站点根绝对路径，已统一改为相对路径，保证在本仓库子目录下能正常加载：

- `judou/index.html`：`/assets/…` → `./assets/…`
- `judou/assets/index-CfY9XuKg.js`：图片 `/assets/*.jpg` → `./assets/*.jpg`
- `judou/assets/index-LppVb9Hi.css`：字体 `url(/fonts/…)` → `url(../fonts/…)`
- 懒加载分片 `./index-BeoRn2gJ.js` 本来就是相对引用，保持不变。

提示词助手 `prompt/` 内部原本就是相对引用（`./style.css`、`./app.mjs`、`./core.mjs`），无需改写即可在子目录运行。

## 已知限制

- **提示词助手的 Office/PDF 附件解析**：`document-parser.mjs` 在浏览器直开模式下依赖打包环境（fflate、fast-xml-parser、xlsx、pdfjs 等）；纯文本类 `.txt/.md/.csv` 可直接读取，Word/Excel/PPT/PDF 解析需要按上游方式接入依赖后才完整可用，不影响"输入需求 → 整理提示词草稿 → 复制/下载"主流程。
- **句读没有前端源码工程**：本仓库落地的是可运行静态成品；复杂功能改造需另找源码重建。
- 未配置 GitHub Pages Actions，线上暂不发布；如之后需要线上访问，再单独开启 Pages 并把根目录作为发布目录。

## 来源与归属

- 提示词助手 Prompt Workbench：派生自公开仓库 `lamongl/-`，原始许可证为 MIT（上游根目录 `LICENSE`），本目录保留其可运行源码用于本地学习与二次修改。
- 句读 JUDOU：来自公开仓库 `caojingxuan14/caojingxuan14.github.io`（导入时上游提交 `9731e14`，共 15 个文件已 1:1 落入 `judou/`，无遗漏）；素材来源见 `judou/assets/CREDITS.md`。
  - 保持原样未改的 12 个文件：6 张配图、3 个字体、懒加载分片 `index-BeoRn2gJ.js`、`CREDITS.md`、`.nojekyll`。
  - 仅为子目录可运行而改写路径的 3 个文件：`judou/index.html`、`judou/assets/index-CfY9XuKg.js`（图片路径）、`judou/assets/index-LppVb9Hi.css`（字体路径）；未改动界面功能与文案逻辑。
- 仅做了目录归并、相对路径适配和本地可编辑化整理，未改动两个应用的核心行为。
