---
title: 从第一个程序开始
description: 准备工具链，运行 .cv 文件，区分原生运行、解释执行和生成 C++。
section: learn
lesson: 0
source: docs/cli.md
---

## 你将学会什么

这套教程从运行一个文件开始，依次学习值、函数、控制流、数据结构、所有权、文本、闭包、失败、模块、编译期执行与 C++ 接入，最后完成一个带验证和恢复逻辑的小程序。每章提供可读的完整示例、预期结果和练习。

需要会使用终端和编辑文本文件。开始几章无需先掌握 C++；接入原生库时再介绍相应构建责任。

## 准备编译器

Carven 生成 C++。构建编译器需要 Git、Xmake 和支持项目 C++26 模块的工具链；当前仓库验证 LLVM/Clang 与 libc++ 23.1.0。生成程序最低 C++20，宿主与目标要求分别满足。

```sh
git clone https://github.com/ryblust/carven.git
cd carven
./xmakew build
```

Windows 的仓库包装器写作 `.\xmakew.ps1`。后续教程的直接原生运行模式当前面向 POSIX。使用已安装 Carven 时，下面命令中的 `./xmakew run carven` 可以换成 `carven`。

## 写出第一个文件

在编译器仓库根目录保存 `main.cv`：

```carven
fn add(left: i32, right: i32) -> i32 {
    return left + right;
}

fn main() {
    let answer = add(20, 22);
    println("Answer:", answer);
}
```

`fn` 声明函数，参数后的 i32 是有符号 32 位整数。`-> i32` 指定成功返回类型，return 返回值。let 建立不可重新赋值的局部 owner；println 无需导入，实参间加一个空格，末尾加换行。

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

输出仍是 Answer: 42。解释器并不支持全部语言；后面的 typed failure、闭包和 C++ 章节使用原生运行。

## 后续示例怎样保存与运行

没有另行说明时，每个带 main 的完整示例单独保存为 main.cv，替换前一个示例，再执行 `./xmakew run carven main.cv`。同一章出现多个 main 时，分别运行，不把它们拼接到一个文件或同一输入批次。

只展示局部写法的片段需要放入对应示例的上下文；多文件示例会标明文件名与完整输入批次。普通 test 需要生成并编译测试入口，不能仅靠运行源文件触发；const test 则在语义分析时执行。

后文命令表中的 `carven` 是可执行文件的简写。在源码仓库中尚未安装时，将其替换成 `./xmakew run carven`；原生编译命令仍使用 clang++。

## 顶层入口

简单脚本可以只写顶层语句：

```carven
let answer = 20 + 22;
println("Answer:", answer);
```

它们组成隐式入口。一个批次只能有一个入口，不要把这个片段与前面的 main 一起放进同一批次。

## 练习

把 add 的第二个实参改成 2，预期输出 Answer: 22。再去掉 println 里的字符串，预期只输出 22。分别执行运行和 compile 命令，确认只有运行命令执行 main 中的打印。
