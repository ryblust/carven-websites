# Carven 官网

介绍 Carven 的设计哲学、适用场景、失败契约、C++ 自动生成和语言入门。采用 TanStack Start、React、Effect 4、TypeScript 7、Vite 8；构建时输出完整静态页面。

网站的源代码、依赖和产物都在此目录。构建不读取或修改相邻的 Carven 编译器。

## 本地开发

```sh
./sitew dev
./sitew status
./sitew stop
```

访问 [本地官网](http://127.0.0.1:4321/)。开发服务在后台运行，日志位于 `.site/dev.log`。使用 `./sitew dev:foreground` 可以前台运行并用 Ctrl+C 停止。

需要 Node.js 24+。`sitew` 优先使用系统 Node，本机没有时使用已有的 Codex 运行时。TypeScript 7 的 npm 包自带原生编译器，无需安装 Go。

首次在另一台电脑安装，使用 `package.json` 指定的 pnpm 版本：

```sh
pnpm install --frozen-lockfile
./sitew dev
```

统一格式化使用项目本地 Prettier：`./sitew format`；只检查格式使用 `./sitew format:check`。生成文件、依赖、锁文件和字体许可证不参与格式化，文档中的代码示例保留原样。

## 构建与验证

```sh
./sitew build
./sitew test
./sitew check:links
```

构建执行内容生成、Vite 构建、TanStack 预渲染和 TypeScript 7 类型检查。`./sitew typecheck` 可以单独检查类型；全新安装时先构建以生成路由与内容。

静态交付目录是 `dist/client/`。完整 HTML 支持不运行 JavaScript 的阅读和导航。`dist/server/` 是预渲染中间产物。静态预览：

```sh
python3 -m http.server 4322 --bind 127.0.0.1 --directory dist/client
```

通过 [HTTP 地址](http://127.0.0.1:4322/) 访问，而非直接双击 HTML。

## 代码职责

| 位置                                       | 职责                                           |
| ------------------------------------------ | ---------------------------------------------- |
| `src/routes/`                              | 文件路由、页面元信息、独立文章导入             |
| `src/views/HomeContent.tsx`、`src/styles/` | 首页叙事与 Jet Black 视觉                      |
| `src/layouts/Site.tsx`                     | 根文档的公共导航与页脚                         |
| `src/layouts/Article.tsx`                  | 文章布局、内容导航与章节切换                   |
| `src/content/`                             | Markdown、元数据 Schema                        |
| `scripts/content/`                         | Effect 内容构建服务、平台层与开发更新          |
| `src/effects/`                             | 复制、失败恢复与可取消反馈                     |
| `tests/`                                   | 内容边界、构建、资源释放、复制取消和子路径导航 |

新增文章需要新增 Markdown 和对应文件路由；路由的 `head` 从生成的 manifest 读取元信息，组件只导入自己的文章模块。教程与 Reference 分别声明从 0 开始、连续且唯一的 `lesson`，两套章节导航独立生成。

`src/generated/`、`src/routeTree.gen.ts` 由工具生成，不手工修改。Markdown 来自本项目维护的文件；正文不接受用户提交的 HTML。开发时通过 ManagedRuntime 复用渲染服务，内容更新串行执行，服务关闭时释放资源。

品牌名称与首页标语使用本地 Cormorant Garamond；正文与控件使用平台系统字体，代码使用系统等宽字体。

## Agent 上手

新任务以 `carven-websites` 为项目目录，从 [AGENTS.md](AGENTS.md) 开始。[框架与 Agent Skills 索引](docs/frameworks.md) 记录技术栈的官方资料、随依赖发布的 Skills，以及按任务读取它们的方法。首次安装依赖后即可读取本地资料，无需额外全局安装 Skills。

`AGENTS.md` 引导 Agent 按需读取这些文件；依赖包里的 `SKILL.md` 不代表已自动注册到每一种 Agent 工具。版本以 `package.json`、`pnpm-lock.yaml` 和实际安装包为准。

## 静态部署配置

GitHub Pages workflow 位于 `.github/workflows/pages.yml`，手动触发并只从默认分支部署。它安装锁定依赖、检查格式、构建与测试，再上传 `dist/client/`。

首次发布：

1. 将此目录作为独立 Git 仓库推送到目标 GitHub 仓库。
2. 在仓库 **Settings → Pages → Source** 中选择 **GitHub Actions**。
3. 在 **Actions → Deploy website to GitHub Pages → Run workflow** 中选择默认分支。

`configure-pages` 提供真实的 `BASE_PATH` 与 `SITE_URL`，兼容项目子路径和根域名。无需在源码中填写 GitHub 用户名或仓库名。自定义域名先在 Pages 设置中配置，再重新构建发布。

本地验证项目路径：

```sh
BASE_PATH=/carven-websites SITE_URL=https://example.github.io ./sitew build
BASE_PATH=/carven-websites ./sitew check:links
./sitew build
```

`SITE_URL` 是站点 origin，不包含仓库路径，用于生成 sitemap；`BASE_PATH` 是仓库子路径。最后一条命令恢复本地根路径产物。仅上传 `dist/client/`，包括 `index.html`、各路由的完整 HTML、`404.html` 和 `.nojekyll`；无需运行服务端程序。

## 教程与 Reference

`src/content/learn/` 按学习顺序提供完整示例、预期结果和练习。
`src/content/reference/` 按主题描述源程序规则、边界与工具链。
教程保留现有文章路径；Reference 使用 `/reference/` 路径。
文章页提供章节筛选、本页目录和上一章/下一章，窄屏以折叠目录展示。
目录锚点来自每篇文章已渲染的标题，正文由对应路由独立导入。

正文说明当前可用形式、求值顺序、访问、生命周期和失败边界。
语言规则依据编译器仓库，网站负责教学与查阅呈现。
代码片段注明完整程序所需文件或外围上下文，错误示例标明预期诊断。
示例使用四空格缩进，声明之间留空行，函数与控制流的块体展开；短表达式体和简短初始化器可保持单行。
按数据准备、操作和结果观察安排逻辑分段，长签名换行参数；格式化工具不改写 Markdown 中的示例。
优先就地解释，正文交叉引用仅用于必要的外部细节。

| 内容           | 核对来源                                                     |
| -------------- | ------------------------------------------------------------ |
| 源语言与语义   | `docs/semantics.md`、`docs/grammar.md`、相关源语言与诊断测试 |
| 执行方式       | `docs/cli.md`、`src/driver/`、`src/interpreter/`             |
| 原生构建与产物 | `docs/toolchain.md`、示例构建配置                            |
| UTF 标准库     | `crafts/carven/std/utf/`                                     |
| 形式语法附录   | `docs/grammar.md` 的全部 EBNF 块                             |
| 诊断代码目录   | `src/diagnostics/code.cpp` 的注册代码和默认描述              |

更新语义时同步对应教程和 Reference；核对代码与文档分歧后再更新正文。

## 内容依据

来源链接指向 Carven 主分支。内容更新需要核对对应语言文档与代码示例；网站构建成功不等于编译器语义验证。宣传文案应区分已有实现、适用边界和设计目标，尤其是失败接口上界、导出限制与抽象成本。

开发依赖必须与锁文件保持一致。`.pnpm-store/` 是项目的下载缓存，可以在安装完成后删除；`node_modules/` 是运行与构建所需的已安装依赖。不要在服务运行时删除其当前缓存和状态文件。

## 中英文内容

英文为默认语言，使用根路径；中文文章放在 `src/content/zh/`，对应 `/zh/` 路径。两种语言共享布局、组件与代码高亮，每条文章路由只导入自己的正文。教程与 Reference 的章节编号在各语言内独立验证；生成时检查双语文章的路径、section、lesson 与 source 一一对应，缺译或错配会阻止发布生成内容。

页眉语言链接切换到当前文章的另一语言版本，并回到页首；标题翻译后的片段标识不同，不保留旧锚点。语言由 URL 决定，直接访问与禁用 JavaScript 时仍可阅读和切换。页面设置对应的 `html lang`、标题、描述和 alternate 链接；导航、目录、复制反馈与错误页同步本地化。中英文首页共用 HomeContent 和样式，Why Carven 是首页的代码展示区段。
