---
title: "运行第一个程序"
description: 准备工具链，运行 .cv 文件，区分原生运行、解释执行和生成 C++。
section: learn
lesson: 0
source: docs/cli.md
---

## 你将学会什么

从一个可运行的文件开始，逐步写出“失败时不扣库存”的订单程序。每个阶段先提出实际问题，再引入解决它的语言能力。

| 阶段                                                                                                                   | 要完成或验证的事情                         |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| [值](/zh/learn/values/)、[控制流](/zh/learn/control/)、[函数](/zh/learn/functions/)与[数据结构](/zh/learn/aggregates/) | 计算价格、表示库存                         |
| [访问与所有权](/zh/learn/ownership/)、[文本](/zh/learn/text/)与[格式化](/zh/learn/formatting/)                         | 区分读取、修改、转移和借用                 |
| [模块](/zh/learn/modules/)、[失败契约](/zh/learn/failures/)与[回调](/zh/learn/closures/)                               | 拆分接口、组合失败、按责任恢复             |
| [测试](/zh/learn/testing/)与[编译期计算](/zh/learn/constants/)                                                         | 验证行为，在运行前构造静态数据             |
| [C++ 接入](/zh/learn/interop/)与[指针](/zh/learn/pointers/)                                                            | 连接原生提供者，明确外部存储的生命周期责任 |
| [订单项目](/zh/learn/project/)                                                                                         | 合并验证、库存更新、失败恢复与测试         |

C++ 接入章节属于拓展；如果当前只关注 Carven 代码，可以在编译期计算之后直接完成订单项目。

需要会使用终端和编辑文本文件。开始几章无需先掌握 C++；接入原生库时再介绍相应构建责任。

## 准备编译器

Carven 生成 C++。构建编译器需要 Git、Xmake 和支持项目 C++26 模块的工具链；当前仓库验证 LLVM/Clang 与 libc++ 23.1.0。生成程序最低 C++20，宿主与目标要求分别满足。

```sh
git clone https://github.com/ryblust/carven.git
cd carven
./xmakew build
```

Windows 的仓库包装器写作 `.\xmakew.ps1`。直接原生运行依赖 C++ 工具链，不依赖 Xmake。使用已安装 Carven 时，下面命令中的 `./xmakew run carven` 可以换成 `carven`。

## 写出第一个文件

在编译器仓库根目录保存 `main.cv`：

```carven
let answer = 20 + 22;
println("Answer:", answer);
```

`let` 为值命名，之后不能重新赋值。`println` 无需导入，实参间加一个空格，末尾加换行。这些顶层语句按顺序执行，组成隐式程序入口；第一个程序还不需要声明函数。

运行：

```sh
./xmakew run carven main.cv
```

输出：

```text
Answer: 42
```

直接运行会先生成 C++，再编译、链接、执行。CXX 可以指定原生编译器路径，默认 clang++。

## 查看生成结果

```sh
./xmakew run carven compile --stdout main.cv
```

compile 只生成产物，`--stdout` 用文件名标题分隔各文件，适合阅读。要给构建系统使用，写入目录：

```sh
./xmakew run carven compile -o generated main.cv
```

也可以直接解释这个支持子集内的程序：

```sh
./xmakew run carven interpret main.cv
```

输出仍是 Answer: 42。解释器并不支持全部语言；后续章节统一使用原生运行；typed failure 也可以解释执行，闭包和 C++ 操作则需要原生执行。

## 后续示例怎样保存与运行

没有另行说明时，每个带 main 的完整示例单独保存为 main.cv，替换前一个示例，再执行 `./xmakew run carven main.cv`。同一章出现多个 main 时，分别运行，不把它们拼接到一个文件或同一输入批次。

只展示局部写法的片段需要放入对应示例的上下文；多文件示例会标明文件名与完整输入批次。普通 test 需要生成并编译测试入口，不能仅靠运行源文件触发；const test 则在语义分析时执行。

后文命令表中的 `carven` 是可执行文件的简写。在源码仓库中尚未安装时，将其替换成 `./xmakew run carven`；原生编译命令仍使用 clang++。

## 为入口命名

示例逐渐变大后，我们用显式 main 把程序入口与可复用函数区分开。将整个文件替换为：

```carven
fn main() {
    let answer = 20 + 22;
    println("Answer:", answer);
}
```

输出相同。`fn main()` 声明程序入口，花括号中是要执行的语句。一个批次最多一个入口：顶层可执行语句与 main 二选一。后续章节使用这个显式形式，依次介绍变量、控制流，再增加其他函数。

## 练习

把 `20 + 22` 改成 `20 + 2`，预期输出 `Answer: 22`。再去掉 println 里的字符串，预期只输出 `22`。分别执行运行和 compile 命令，确认只有运行命令执行这里的打印。把顶层版本和显式 main 版本分别保存，每次单独运行一个。
