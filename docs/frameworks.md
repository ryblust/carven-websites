# 框架与 Agent Skills

本文负责依赖资料的发现与读取。项目约束由根目录 `AGENTS.md` 定义，操作命令由 `README.md` 说明。

修改框架集成或依赖时，用 `package.json` 与相关配置确认版本，再按任务选择下面的资料。精确版本由 `pnpm-lock.yaml` 记录；安装依赖使用项目指定的 pnpm 和 `pnpm install --frozen-lockfile`。本地 Skill 缺失时先确认依赖是否安装。

## 技术栈与官方资料

| 技术                      | 本项目用途                                      | 官方入口                                                                                                                                             |
| ------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| TanStack Start / Router   | 文件路由、元信息、构建时预渲染、客户端导航      | [Start](https://tanstack.com/start/latest/docs/framework/react/overview)、[Router](https://tanstack.com/router/latest/docs/framework/react/overview) |
| React                     | 页面组件与交互生命周期                          | [API 参考](https://react.dev/reference/react)                                                                                                        |
| Effect 4 RC               | 内容生成、I/O、Schema、资源管理、预期失败与取消 | 优先读安装包内的 `AGENTS.md` 和 `ai-docs/`；[官方 Skills](https://github.com/Effect-TS/skills)                                                       |
| TypeScript 7              | 项目本地原生编译器执行类型检查                  | [7.0 发布说明](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)                                                                 |
| Vite 8                    | 开发服务、模块转换与构建                        | [指南](https://vite.dev/guide/)、[迁移说明](https://vite.dev/guide/migration)                                                                        |
| Motion                    | React 网页动画                                  | [React 文档](https://motion.dev/docs/react)                                                                                                          |
| Vitest / `@effect/vitest` | 单元测试、Effect 测试与 TestClock               | [Vitest](https://vitest.dev/guide/)、Effect 包内测试示例                                                                                             |
| Prettier                  | 统一源码与配置格式                              | [项目安装方式](https://prettier.io/docs/install)                                                                                                     |

构建链以 `vite.config.ts`、`tsconfig.json` 和 `scripts/build.mjs` 为准。TypeScript 负责类型检查，Vite 负责应用构建。当前交付物是 `dist/client/` 静态站点。内容读取、Markdown 转换与语法高亮在构建阶段完成。

## TanStack：按修改范围读取

入口是 `node_modules/@tanstack/react-start/skills/react-start/SKILL.md`。它会引导选择具体边界的 Skill；每次只读与任务相关的部分。

下表路径相对于对应依赖包根目录：

| 修改范围               | 所属包                        | Skill 路径                                   |
| ---------------------- | ----------------------------- | -------------------------------------------- |
| Start 与 React 集成    | `@tanstack/react-start`       | `skills/react-start/SKILL.md`                |
| 导航与类型安全链接     | `@tanstack/router-core`       | `skills/router-core/navigation/SKILL.md`     |
| 路由代码拆分           | `@tanstack/router-core`       | `skills/router-core/code-splitting/SKILL.md` |
| 预渲染与部署           | `@tanstack/start-client-core` | `skills/start-core/deployment/SKILL.md`      |
| 服务端与客户端执行边界 | `@tanstack/start-client-core` | `skills/start-core/execution-model/SKILL.md` |

pnpm 的间接依赖未必出现在 `node_modules/` 顶层。可在项目根目录执行下面的只读命令，解析两个核心包的位置，再进入其 `skills/` 目录。不要把带版本号的 `.pnpm/` 物理路径保存到指引中。

```sh
node --input-type=module <<'NODE'
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
for (const [entry, owner] of [
  ['@tanstack/react-start', '@tanstack/start-client-core'],
  ['@tanstack/react-router', '@tanstack/router-core'],
]) {
  const from = createRequire(require.resolve(`${entry}/package.json`));
  const root = dirname(from.resolve(`${owner}/package.json`));
  console.log(owner, join(root, 'skills'));
}
NODE
```

本项目直接读取安装包内的 Skills。需要工具辅助发现时，可使用官方 [TanStack Intent](https://tanstack.com/intent/latest/docs/getting-started/quick-start-consumers)。

## Effect：以安装的 4.x 资料为准

官方 [effect-ts Skill](https://github.com/Effect-TS/skills/blob/main/skills/effect-ts/SKILL.md) 要求先完整阅读 `node_modules/effect/AGENTS.md`，按需跟随其中的链接，API 不明确时查 `node_modules/effect/src/`。

常用的本地入口：

- Effect、Schema、Service、Layer 与资源管理：从 `node_modules/effect/AGENTS.md` 中选择对应的 `ai-docs/` 示例。
- 框架中复用服务生命周期：`node_modules/effect/ai-docs/src/04_integration/10_managed-runtime.ts`。
- Effect 测试：`node_modules/effect/ai-docs/src/09_testing/10_effect-tests.ts`。
- Layer 测试：`node_modules/effect/ai-docs/src/09_testing/20_layer-tests.ts`。

Effect、`@effect/platform-node` 和 `@effect/vitest` 保持相同 RC 版本。Vitest 的选择还要满足 `@effect/vitest` 的 peer dependencies。不要把 Effect 3 示例直接套进当前代码；外部文章与安装包不一致时，核对当前包的源码和类型。

## 其他边界

- React：在渲染中派生数据，在事件处理器中响应用户操作；用 React effect 同步外部系统并清理订阅。首次客户端渲染与预渲染保持一致。
- Vite：应用中的资源路径使用配置的 base；Node 构建依赖与浏览器依赖分开。调整插件时保持 TanStack Start 在 React 插件之前。
- Shiki：通过 [Highlighter API](https://shiki.style/guide/install) 配置语言和主题，在构建服务内复用实例并释放。首页与文章使用同一语言定义和主题。
- Motion：按交互需要使用动画，阅读和操作不依赖动画完成。用 [可访问性指南](https://motion.dev/docs/react-accessibility) 核对 reduced motion。

## 维护方式

- 保存官方入口、任务映射和项目适用边界；Skills 正文由依赖包提供，避免维护复制出来的第二份手册。
- 升级依赖时重新检查 Skill 路径、API 与版本兼容性。随包发布的 Skill 也可能有旧例子或旧版本标注，最终以安装的代码和实际验证为准。
- 新增项目级 Skill 时记录来源及读取方式。
