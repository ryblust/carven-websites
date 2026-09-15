---
title: 日常工作流与排错
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

解释器先做同样的语义分析，再对被调用代码做执行准入，不支持的操作报错而不转原生执行。typed failure、闭包、切片和原生操作等使用原生路径。

## 测试放在哪一层

纯编译期算法可用 const test，普通源行为用 test，原生互操作还需在真实 C++ 构建中验证。生成成功不证明提供者存在，静态断言通过也不证明原生析构或异常行为。

Carven 仓库使用 ./xmakew，相关组有 internal、language、crafts、interop、cli、examples。消费项目使用自己的 Xmake 目标，不把编译器内部测试目标当成应用 API。

## 按错误边界排查

1. 找不到名字：核对输入批次、模块规范路径、using 和可见性。
2. 类型不匹配：核对字面量上下文、显式 as、精确参数访问与成功结果。
3. owner 不可用：找之前的 Take，以及所有正常继续路径是否已恢复。
4. 借用冲突：找活着的 str、切片、view 和 Write 捕获持有者。
5. 失败未处理：检查调用契约、?、handler 的剩余集合和外围契约。
6. 原生错误：核对头文件、C++ 签名、构造与链接输入。

## 接下来怎样使用 Reference

按主题选择章节，确认当前支持形式、前置条件、求值顺序和边界行为。教程的例子帮助建立模型；真正修改接口前，核对返回借用、失败集合、所有权转移和 C++ 提供者责任。把可观察的业务要求留在测试中。
