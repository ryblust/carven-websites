---
title: "运行、格式化与排错"
description: "选择运行、格式化和测试命令，找到错误原因。"
section: learn
lesson: 19
source: docs/toolchain/cli.md
---

## 按任务选择工具

| 任务          | 命令                                                     |
| ------------- | -------------------------------------------------------- |
| 语义检查      | `carven check main.cv`                                   |
| 原生测试      | `carven --tests main.cv`                                 |
| 解释测试      | `carven interpret --tests main.cv`                       |
| 阶段耗时      | `carven check --timings main.cv`                         |
| 原生运行      | `carven main.cv`                                         |
| 仅生成文件    | `carven compile -o generated main.cv`                    |
| 查看生成内容  | `carven compile --stdout main.cv`                        |
| 解释支持子集  | `carven interpret main.cv`                               |
| 跟踪解释执行  | `carven interpret --trace main.cv`                       |
| 限制解释步数  | `carven interpret --max-steps 10000 main.cv`             |
| 查看词法/语法 | `carven dump tokens main.cv` / `carven dump ast main.cv` |

使用 interpret 可以不编译 C++，直接运行受支持的 Carven 代码。执行限制与原生调用行为见[命令行参考](/zh/reference/cli/)。

要逐步观察执行，把[区间分类示例](/zh/learn/control/#按区间选择结果)保存为 main.cv，运行 `carven interpret main.cv`，输出应为 `pass`。再加入 --trace，即可查看执行到的语句。学习完整语言和接入 C++ 库时，使用原生运行模式。

源码收集、工具链选择与安装布局见[命令行参考](/zh/reference/cli/)。多文件命令仍须列出各个应用文件，见[模块教程](/zh/learn/modules/)。

## 先检查，再运行

只想检查类型、借用和编译期计算，而不构建程序时，先用 check。保存为 `prices.cv`：

```carven
const fn line_total(price: i32, quantity: i32) -> i32 => price * quantity;

const test {
    check(line_total(12, 3) == 36);
}
```

运行：

```sh
carven check prices.cv
```

命令在 stderr 输出 `carven: check passed`，其中已经执行了静态测试。check 不需要程序入口。把 36 改成 35 再检查：测试以 `CV-CONST-TEST` 失败，显示条件和计算结果，check 返回 1。

编译期调用只能选择 `const fn`。去掉 line_total 的 `const` 后，check 会在测试中的调用处报告 `CV-CONST-ADMISSION`。

加上 `--timings` 查看命令把时间花在哪里：

```sh
carven check --timings prices.cv
```

stderr 报告显示总耗时、各阶段耗时及其占比，不会混入 stdout 上的程序输出或生成产物。颜色设置与完整阶段列表见[命令行参考](/zh/reference/cli/)。

## 用 `carven-format` 格式化源码

`carven-format` 是独立的 `.cv` 源码格式化工具。先确保终端可以调用它，再从练习目录预览单文件、检查整个目录或修改文件：

```sh
carven-format main.cv
carven-format check .
carven-format write .
```

第一条运行命令在 stdout 预览格式化结果。`check` 列出需要调整的文件，有差异时返回 1；`write` 原地修改文件。文件选择、帮助与退出码见[命令行参考](/zh/reference/cli/)。

格式化只调整排版，之后仍需进行语义检查和测试。

## 阅读格式化后的源码

短的导入列表放在一行，花括号内留空格，末项后不加逗号：

```carven
import std::utf using { from_utf8, to_string };
import <vector> using std::{ vector, allocator };
```

较长的列表按行展开，末项也带逗号。已有尾逗号不会强制把短列表展开；让 `carven-format` 根据行宽安排即可。

格式化工具保留表达式体函数和源码中的导入顺序。

## 区分编译期、运行时与互操作测试

编译期算法使用 `const test`，运行时行为使用 test；两者都可以省略名字，失败时以文件、行和列标识测试。原生互操作在 C++ 构建中测试，同时覆盖链接、析构和异常边界。

## 按错误边界排查

1. 找不到名字：核对输入批次、模块规范路径、using 和可见性。
2. 类型不匹配：核对字面量上下文、显式 as、参数的访问方式和成功时的返回值。
3. 值不可用：找到它被取走的位置，随后停止使用旧变量，或在再次使用前给它赋新值。
4. 借用冲突：查找仍在作用域中的 `str`、切片、可调用视图，以及仍持有 Write 捕获的值。
5. 失败未处理：确认被调函数可能报告哪些错误、catch 处理了哪些，以及调用者还需要声明哪些。
6. 原生错误：核对头文件、C++ 签名、构造与链接输入。

## 查阅语言参考

查语法与 API 时使用[参考索引](/zh/reference/)，查编译器错误代码时使用[诊断目录](/zh/reference/diagnostics/)。
