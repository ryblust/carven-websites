---
title: "运行第一个程序"
description: "准备工具链，运行 .cv 文件，并看看它怎样变成 C++ 程序。"
section: learn
lesson: 1
source: docs/language/tutorial.md
---

这是教程的第一篇实操章节。学习路线与最终项目见[教程总览](/zh/learn/)。

## 准备编译器

Carven 生成 C++。构建编译器需要 Git、Xmake 3.1.1，以及支持项目 C++26 模块的 LLVM/Clang 与 libc++；当前验证的工具链版本为 LLVM 23，Windows 使用 LLVM-MinGW。生成的程序使用 C++20。

```sh
git clone https://github.com/ryblust/carven.git
cd carven
./xmakew build
```

Windows 使用仓库中的构建脚本 `.\xmakew.ps1`。直接原生运行依赖 C++ 工具链，不依赖 Xmake。使用已安装 Carven 时，下面命令中的 `./xmakew run carven` 可以换成 `carven`。

## 写出第一个文件

在编译器仓库根目录保存 `main.cv`：

```carven run
let unit_price = 1200;
let quantity = 3;
println("Order total:", unit_price * quantity);
```

`let` 为值命名，之后不能重新赋值。`println` 无需导入，实参间加一个空格，末尾加换行。这些顶层语句按顺序执行，组成隐式程序入口；第一个程序还不需要声明函数。本例用整数表示货币最小单位，使计算结果保持精确。

点击代码框右上角的「运行」，可以直接在浏览器中执行这个示例。要在本地运行保存的文件：

```sh
./xmakew run carven main.cv
```

输出：

```text
Order total: 3600
```

直接运行会先生成 C++，再编译、链接、执行。选择原生编译器的方法见[工具链参考](/zh/reference/toolchain/)。

## 查看生成结果

```sh
./xmakew run carven compile --stdout main.cv
```

compile 只生成产物，`--stdout` 用文件名标题分隔各文件，适合阅读。要给构建系统使用，写入目录：

```sh
./xmakew run carven compile -o generated main.cv
```

这个程序也在解释器的支持范围内，可以直接运行：

```sh
./xmakew run carven interpret main.cv
```

输出仍是 Order total: 3600。想运行受支持的 Carven 程序而不编译 C++ 时，可以使用这个命令。后面的章节默认使用原生运行，因此调用 C++ 或使用捕获闭包的例子也能运行。

## 只检查，不运行

```sh
./xmakew run carven check main.cv
```

check 检查源码而不运行程序，但仍会执行源码明确要求的编译期工作。检查通过时在 stderr 输出 `carven: check passed`。加上 `--timings` 可以在 stderr 查看各阶段耗时：

```sh
./xmakew run carven check --timings main.cv
```

## 后续示例怎样保存与运行

课程未指定其他文件名时，把完整示例保存为 main.cv，替换前一个示例。然后执行 `./xmakew run carven main.cv`。同一章出现多个完整程序时，分别运行，不把它们拼接到一个文件或同一输入批次。文件名必须是合法标识符：`main.cv`、`order_items.cv` 可以，`my-file.cv` 不行。

扩展已有程序的片段会说明需要保留哪些声明；多文件示例会列出传给编译器的全部文件。测试章节会介绍单独运行测试的命令；普通运行执行应用程序，不会顺带执行测试。

后文命令表中的 `carven` 是可执行文件的简写。在源码仓库中尚未安装时，将其替换成 `./xmakew run carven`；原生编译命令仍使用 clang++。

## 为入口命名

顶层语句适合短程序。想让入口与可复用函数明确分开时，可以改用 main。将整个文件替换为：

```carven run
fn main() {
    let unit_price = 1200;
    let quantity = 3;
    println("Order total:", unit_price * quantity);
}
```

输出相同。`fn main()` 声明程序入口，花括号中是要执行的语句。一个程序最多一个入口：顶层可执行语句与 main 二选一。接下来几章继续使用顶层语句，并在其上方增加函数和类型；需要具名入口时，后面的章节会使用 main。

## 练习

把 quantity 从 `3` 改成 `4`，预期输出 `Order total: 4800`。再去掉 `println` 里的字符串，预期只输出 `4800`。分别执行 `check`、`compile --stdout` 和直接运行，确认只有运行命令执行这里的打印。把顶层版本和显式 main 版本分别保存，每次单独运行一个。
