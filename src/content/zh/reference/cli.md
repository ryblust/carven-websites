---
title: 命令行与执行模式
description: 直接运行、compile、interpret、输入映射、测试产物和进程状态。
section: reference
lesson: 17
source: docs/cli.md
---

## 命令总览

```sh
carven main.cv
carven main.cv -- argument
carven compile --stdout main.cv
carven compile -o generated main.cv
carven interpret --trace --max-steps 100000 main.cv
carven dump tokens main.cv
carven dump ast main.cv
```

`--help/-h`、`--version/-V` 和 compile/interpret 的 help 可用；无参数打印顶层帮助并成功。源码位置均为显式输入批次。

## 直接原生运行

裸源码调用分析并生成 C++，调用原生编译器编译链接，再执行。当前支持 POSIX，CXX 指定一个编译器可执行名或路径，默认 clang++，其内容不按 shell 参数拆分。请求 C++20，当前目录加入原生头文件搜索。

工具从安装 binary 相邻位置或开发 binary 所在源码树找到 Crafts。临时目录内保存生成文件和 executable，运行结束或处理过的失败后清理。子进程继承工作目录和标准流。

`--` 之前只接收源码路径，之后原样作为程序参数，包括看起来像选项的文本。入口必须存在，多个入口由 Carven 先诊断。原生编译失败或程序状态透传；信号终止映射为 `128 + signal`。

## 解释执行

interpret 先使用相同源批次与语义检查，执行必需常量和 const test，再检查入口及其传递直接调用的执行子集。支持整数、bool、char、str、String、允许的结构体/固定数组、直接调用、局部修改、分支、循环、匹配和打印。

不支持被执行代码中的 C++ 头文件/片段/操作、浮点、callable、typed failure、Write 参数、切片和入口参数值。未用函数仍做普通语言检查，但不要求属于解释执行子集。入口当前必须无参；`--` 后参数与无参入口一样被忽略。

准入失败为 `CV-INTERPRET-ADMISSION`，不回退原生执行。执行失败为 `CV-INTERPRET-EXECUTION`，预算失败为 `CV-INTERPRET-LIMIT`。错误返回 1，正常返回 0；已完成输出保留。

`--trace` 向 stderr 记录解释执行语句位置、调用和成功返回，包含调用缩进，不跟踪前置常量执行，也不记录每个表达式值。程序 stderr 与跟踪共享流。

`--max-steps N` 为非负十进制步数，默认 100,000，嵌套调用共享入口预算；它限制步骤而非耗时或阻塞输出。仍适用单值大小、调用深度、聚合和文本工作限制。前置每个常量 root 的预算独立，选项不改变其限制。选项不能重复。

## 输入路径

路径为 UTF-8，分隔符 `/`，扩展名 `.cv`。相对路径词法归一化后不得越出工作目录；规范模块名由路径去扩展名、以点连接分量。绝对输入仅接受包含 crafts 层级的路径，从首个 crafts 分量起形成模块名。打开文件时操作系统解析符号链接。

每个分量符合标识符形状，模块分量可以是关键字。同批次不能得到重复规范模块名。导入只解析这些输入。

## compile 产物

| 选项                                               | 行为                                    |
| -------------------------------------------------- | --------------------------------------- |
| 不指定目标                                         | 写到当前目录                            |
| `-o dir` / `--output-dir dir` / `--output-dir=dir` | 写到目标目录                            |
| `--stdout`                                         | 以文件名标题输出到标准输出，无文件 sink |

目标选项最多一种且不能重复。成功分析后按规范路径顺序写文件、创建父目录、覆盖已有文件；首次 I/O 失败停止，之前文件可能已写入。清理旧文件、隔离目录与失败保护由构建系统负责。stdout 形式用于查看，不是直接可编译的单一 C++ 文件。

compile 不调用原生编译链接。`--tests=default` 与 `--tests=external` 互斥且不能重复，不会取消源 main；消费者选择哪些生成翻译单元组成应用或测试可执行程序。

## 链接域

`--linkage-domain=value` 的等号必需，值非空且仅能出现一次，用于确定私有生成 namespace 的调用者身份。默认由绝对规范产物根导出，stdout 使用当前目录作为虚拟根。显式域与路径域即使字符串相同也身份不同。

同逻辑目标复用域，可能链接到同一映像的不同目标使用不同域。移动输出根会改变默认身份；源码文本、模块集合和顺序、位置不参与域计算。链接域不改变 Carven 名义身份，也不定义公开 C++ ABI。

## 诊断与编译期输出

调用、读取、源码或写入失败向 stderr 报告并返回非零；警告不会使成功编译返回非零。dump 只解析一个文件，不执行语义分析、常量测试或产物生成；tokens 在词法成功后输出 token，ast 在解析成功后输出树。

必需常量执行的 print/println 到 stdout，eprint/eprintln 到 stderr；`compile --stdout` 时所有编译期程序输出改去 stderr，保持 stdout 只包含产物。编译后续失败不撤回已输出内容。增量构建复用产物时不会重新执行或重放编译期输出。
