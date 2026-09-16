---
title: "运行、格式化与排错"
description: 选择执行阶段，组织项目验证，并用明确边界定位问题。
section: learn
lesson: 16
source: docs/cli.md
---

## 按任务选择工具

| 任务          | 命令                                                     |
| ------------- | -------------------------------------------------------- |
| 原生运行      | `carven main.cv`                                         |
| 仅生成文件    | `carven compile -o generated main.cv`                    |
| 查看生成内容  | `carven compile --stdout main.cv`                        |
| 解释支持子集  | `carven interpret main.cv`                               |
| 跟踪解释执行  | `carven interpret --trace main.cv`                       |
| 限制解释步数  | `carven interpret --max-steps 10000 main.cv`             |
| 查看词法/语法 | `carven dump tokens main.cv` / `carven dump ast main.cv` |

解释器先做同样的语义分析，再检查被调用代码是否属于支持的执行范围，不支持的操作报错而不转原生执行。包含类型化失败、闭包、切片或原生操作的代码应使用原生运行模式。

在 `69e13f4a` 版本中，[整数分类示例](/zh/learn/control/)使用 `interpret` 会触发缺少内建类型的内部错误。该示例请用 `carven main.cv` 运行，原生执行已验证。

## 用 Graver 格式化源码

Graver 是独立的 `.cv` 源码格式化工具。在 Carven 仓库根目录构建后，先预览单文件，再检查或修改整个目录：

```sh
./xmakew build graver
./xmakew run graver main.cv
./xmakew run graver check examples
./xmakew run graver write examples
```

第一条运行命令把格式化结果写到 stdout，不修改文件。`check` 列出需要调整的路径，有差异时返回 1，适合用于 CI；`write` 原地更新有变化的文件。Windows 使用 `.\xmakew.ps1`。直接调用已构建的可执行文件时，用 `graver` 替代 `./xmakew run graver`。

Graver 使用固定的四空格缩进和 100 字节目标行宽。它检查词法与语法，不解析模块依赖、不做类型检查，也不执行 const fn 或 const test；格式检查通过后仍需构建和测试。命令与文件选择规则见[命令行 Reference](/zh/reference/cli/#graver)。

## 测试放在哪一层

纯编译期算法可用 const test，普通源行为用 test，原生互操作还需在真实 C++ 构建中验证。生成成功不证明提供者存在，静态断言通过也不证明原生析构或异常行为。

Carven 仓库使用 ./xmakew，相关组有 internal、language、crafts、interop、cli、examples。使用 Carven 的项目定义自己的 Xmake 目标，不把编译器内部测试目标当成应用 API。

## 按错误边界排查

1. 找不到名字：核对输入批次、模块规范路径、using 和可见性。
2. 类型不匹配：核对字面量上下文、显式 as、精确参数访问与成功结果。
3. owner 不可用：找之前的 Take，以及所有正常继续路径是否已恢复。
4. 借用冲突：查找仍在作用域中的 str、切片、可调用视图，以及仍持有 Write 捕获的值。
5. 失败未处理：检查调用契约、?、处理分支未覆盖的失败集合和外围契约。
6. 原生错误：核对头文件、C++ 签名、构造与链接输入。

## 接下来怎样使用 Reference

按主题选择章节，确认当前支持形式、前置条件、求值顺序和边界行为。教程的例子帮助建立模型；真正修改接口前，核对返回借用、失败集合、所有权转移和 C++ 提供者责任。用测试验证业务要求对应的可观察行为。
