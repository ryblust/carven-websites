---
title: "运行第一个程序"
description: "准备工具链，运行 .cv 文件，并看看它怎样变成 C++ 程序。"
section: learn
lesson: 1
source: docs/language/tutorial.md
---

这是教程的第一篇实操章节。学习路线与最终项目见[教程总览](/zh/learn/)。

## 准备编译器

使用 `carven` 时，保留配套的 [Crafts 资源](https://github.com/ryblust/carven/blob/main/docs/toolchain/cli.md#source-collection)。从源码构建时，按[编译器构建说明](https://github.com/ryblust/carven#development)准备，其中也说明了构建后的可执行文件位置。

把 `carven`（Windows 上为 `carven.exe`）所在目录加入 `PATH`。将下方示例路径替换为该目录的绝对路径。

macOS 和 Linux：

```sh
export PATH="/absolute/path/to/compiler-directory:$PATH"
```

Windows PowerShell：

```powershell
$env:Path = "C:\path\to\compiler-directory;$env:Path"
```

以上设置只对当前终端生效。要在以后打开的终端中使用，将该目录加入 shell 启动配置或 Windows 用户 `Path`。检查命令是否可用：

```sh
carven --version
```

Carven 生成 C++20。原生运行还需要环境中有支持 C++20 的编译器、SDK 和链接器。默认编译器为 `clang++`，可用 `CXX` 选择其他编译器。解释执行和语义检查不需要原生编译。

## 写出第一个文件

新建一个练习目录，在该目录打开终端，并保存 `main.cv`：

```carven run
let unit_price = 1200;
let quantity = 3;
println("Order total:", unit_price * quantity);
```

`let` 为值命名，之后不能重新赋值。`println` 无需导入，实参间加一个空格，末尾加换行。这些顶层语句按顺序执行，组成隐式程序入口；第一个程序还不需要声明函数。本例用整数表示货币最小单位，使计算结果保持精确。

点击代码框右上角的「运行」，可以直接在浏览器中执行这个示例。要在本地运行保存的文件：

```sh
carven main.cv
```

输出：

```text
Order total: 3600
```

直接运行会先生成 C++，再编译、链接、执行。选择原生编译器的方法见[工具链参考](/zh/reference/toolchain/)。

## 查看生成结果

```sh
carven compile --stdout main.cv
```

compile 只生成产物，`--stdout` 用文件名标题分隔各文件，适合阅读。要给构建系统使用，写入目录：

```sh
carven compile -o generated main.cv
```

这个程序也在解释器的支持范围内，可以直接运行：

```sh
carven interpret main.cv
```

输出仍是 Order total: 3600。想运行受支持的 Carven 程序而不编译 C++ 时，可以使用这个命令。后面的章节默认使用原生运行，因此调用 C++ 或使用捕获闭包的例子也能运行。

## 只检查，不运行

```sh
carven check main.cv
```

check 检查源码而不运行程序，但仍会执行源码明确要求的编译期工作。检查通过时在 stderr 输出 `carven: check passed`。加上 `--timings` 可以在 stderr 查看各阶段耗时：

```sh
carven check --timings main.cv
```

## 后续示例怎样保存与运行

课程未指定其他文件名时，把完整示例保存为 main.cv，替换前一个示例。然后执行 `carven main.cv`。同一章出现多个完整程序时，分别运行，不把它们拼接到一个文件或同一输入批次。文件名必须是合法标识符：`main.cv`、`order_items.cv` 可以，`my-file.cv` 不行。

扩展已有程序的片段会说明需要保留哪些声明；多文件示例会列出传给编译器的全部文件。测试章节会介绍单独运行测试的命令；普通运行执行应用程序，不会顺带执行测试。

各课命令均在相应练习目录执行，源码路径相对于该目录，不需要编译器仓库。原生编译示例使用 `clang++`。

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
