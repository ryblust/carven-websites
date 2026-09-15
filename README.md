# Carven Website

Carven 官网、教程与语言 Reference。基于 TanStack Start、React、Effect、TypeScript 和 Vite，预渲染为静态页面。

[官网](https://ryblust.github.io/carven-websites/) · [Carven](https://github.com/ryblust/carven)

## 开发

需要 Node.js 24+，pnpm 版本由 `package.json` 指定。

```sh
pnpm install --frozen-lockfile
./sitew dev
```

本地地址：`http://127.0.0.1:4321/`。使用 `./sitew stop` 停止后台预览。

```sh
./sitew format:check
./sitew build
./sitew test
./sitew check:links
```

## 结构

- `src/content/`：英文内容；`src/content/zh/`：中文内容。
- `src/routes/`：路由与页面元信息。
- `src/views/`、`src/layouts/`、`src/components/`：页面、布局与交互。
- `src/styles/`：全站与首页样式。
- `scripts/content/`：内容生成与代码高亮。
- `tests/`：网站测试。

修改文章时同步中英文内容及对应路由。`src/generated/` 与 `src/routeTree.gen.ts` 由工具生成。

## 发布

GitHub Pages 从 `main` 手动发布：[运行发布工作流](https://github.com/ryblust/carven-websites/actions/workflows/pages.yml)。推送代码不会自动部署。

发布目录为 `dist/client/`。工作流从 Pages 配置读取 `BASE_PATH` 与 `SITE_URL`；本地构建也可通过这两个环境变量指定路径前缀与站点 origin。
