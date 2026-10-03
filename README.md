# Carven Website

Carven 的官方网站，提供中文和英文的语言介绍、入门教程与语言参考。

Playground 在浏览器内检查和解释执行单个 Carven 文件，也能查看生成的 C++；无需执行服务器。构建与运行边界见 [Playground 说明](scripts/playground/README.md)。

[访问网站](https://ryblust.github.io/carven-websites/) · [Carven 项目](https://github.com/ryblust/carven)

## 本地开发

使用 `package.json` 指定的 pnpm 版本；`pnpm install` 会安装锁定的依赖和 Node.js 运行时。Playground 的 WASM 构建还需要 Python 3，支持的平台见 [构建说明](scripts/playground/README.md)。

```sh
pnpm install
pnpm playground:build
pnpm dev
```

`pnpm dev` 在前台启动开发服务，访问终端显示的地址，按 Ctrl+C 停止。WASM 只需在首次使用或更新编译器基线后重建，日常页面编辑无需重复编译。

```sh
pnpm format:check
pnpm build
pnpm test
pnpm check:links
pnpm preview
```

`pnpm build` 包含类型检查，静态发布目录为 `dist/client/`；`pnpm preview` 用于本地预览构建结果。部署沿用 GitHub Pages 工作流。
