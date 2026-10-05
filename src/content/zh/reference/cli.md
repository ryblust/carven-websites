---
title: "编译器命令与 Graver"
description: 原生运行、解释执行、生成产物与 Graver 源码格式化。
section: reference
lesson: 19
source: docs/toolchain/cli.md
---

## 命令总览

```sh
carven main.cv
carven --tests main.cv
carven check --timings main.cv
carven main.cv -- argument
carven compile --stdout main.cv
carven compile -o generated main.cv
carven interpret --trace --max-steps 100000 main.cv
carven interpret --tests main.cv
carven dump main.cv
carven dump tokens main.cv
carven dump ast main.cv
```

支持 `--help/-h`、`--version/-V` 及 compile/check/interpret/dump 的命令帮助；无参数打印顶层帮助并成功。

## 源码收集

`check`、`compile`、直接原生运行和 `interpret` 都将显式应用 `.cv` 输入与固定目录中递归收集的 `.cv`、`.cpp` 合并。固定目录为匹配工具链的 `crafts/carven/` 和工作目录可选的 `crafts/`，且必须提供至少一个显式 `.cv` 输入。import 在批次内解析，不发现或下载文件。不递归跟随目录符号链接；按文件系统规范路径去重、按路径拼写排序。不同文件形成相同模块身份时是错误。

所有收集的 `.cv` 都进行语义检查、必需常量求值和静态测试，即使没有被导入。测试模式选择全部普通测试。收集根内的 `examples/`、`tests/` 也参与构建；已安装库源码必须能共同构建，并将程序入口留给应用。独立示例、故意无效的测试和替代构建目标应放在收集根外。

自定义集成可把外部仓库放在 `thirdparty/` 等目录，显式传入所需 `.cv`，由外部构建配置原生源码、头文件、宏、选项与库。官方与第三方 Crafts 使用相同收集规则。

## 语义检查

`carven check main.cv` 完成语义分析，包括必需常量、常量块和 `const test`，不生成产物，也不要求入口。普通函数和运行时测试只检查、不执行。原生重载、模板和原生类型性质仍由 C++ 编译验证。

成功返回 0，在 stderr 打印 `carven: check passed`；调用、输入或分析错误返回 1，警告不改变成功状态。`--timings` 将耗时加入成功报告，不重复打印。

## 阶段计时

check、compile、interpret、dump 和原生运行均支持 `--timings`。它向 stderr 报告结果、总墙钟时间和已尝试阶段，失败命令也报告。分析时间包含必需常量执行与静态测试，原生运行还报告 C++ 编译链接时间。程序流和产物流保持独立。总时间包含准备、诊断和清理，可能大于各阶段之和。无效选项不产生计时报告；原生和解释运行中的 `--` 结束选项解析。

```sh
carven check --timings main.cv
```

```text
carven: check passed in 86.9 ms
  Stage                          Time  % total
  ---------------------- ------------ --------
  Source collection            2.6 ms     3.0%
  Source loading               1.0 ms     1.2%
  Lexing                       1.0 ms     1.1%
  Parsing                      4.5 ms     5.1%
  Semantic analysis           74.5 ms    85.8%
```

耗时因机器而异。第一行说明结果，例如 `interpretation finished`、`compilation finished` 或 `run exited with code 0`。check、compile 和运行命令都报告源码收集；compile 另有 `C++ generation` 与 `Artifact writing`；原生运行另有 `Native compilation`；原生与解释运行把运行阶段标为 `Execution`。报告供人阅读。

各阶段列出耗时及其占总时间的比例。占比使用未舍入的耗时计算；总时间还包含准备、诊断和清理，因此各阶段占比之和可能小于 100%。低于显示精度的值写作 `<0.1 ms` 或 `<0.1%`。

## 直接原生运行

裸源码调用分析收集后的批次、生成 C++，将生成实现与收集到的 `.cpp` 一起编译链接，再执行程序；不依赖 Xmake 或其他构建工具。

`CXX` 指定一个编译器可执行名或路径，默认 `clang++`，不按 shell 参数拆分。请求 C++20；`cl`、`clang-cl` 使用 MSVC 风格参数，其他驱动使用 GCC 风格参数。原生工具链所需的 SDK、链接器和环境由用户准备。驱动通过平台进程接口启动工具链和生成的程序。

独立安装时，将 `bin/carven`（Windows 为 `bin/carven.exe`）和匹配的 `crafts/carven/` 放在同一安装根下；开发版也可从可执行文件所在的源码树定位 Crafts。头文件搜索包含生成目录、工具链和项目的 Crafts 目录及当前目录。

每次运行在系统临时目录创建独立的 `carven-run-*` 目录，保存生成文件和原生可执行文件，不复用缓存。执行完成或驱动处理完失败后清理；强制终止可能留下目录，清理失败会警告。子进程继承工作目录和标准流，相对文件路径仍以用户的当前目录为准。

`--` 之前接收源码路径、`--tests` 和 `--timings`，之后作为程序参数传递，不经过 shell，包括空参数、空格、引号和反斜杠。程序模式要求入口存在，多个入口由 Carven 先诊断。原生编译失败或程序状态透传；POSIX 信号终止映射为 `128 + signal`。复杂原生依赖和增量构建由外部构建系统处理。

原生编译器输出自己的诊断后，Carven 标明失败的编译或链接阶段、编译器可执行文件及退出状态。

`carven --tests main.cv` 执行普通运行时测试，要求至少一条运行时测试。静态测试仍在分析时执行。失败 check 累积，require/fail 停止当前测试，后续测试继续；断言和运行时 trap 则中止进程。任意测试失败使状态非零。测试模式不执行顶层语句或 main。

## 解释执行

解释模式直接执行支持的源操作，遵循普通 Carven 语义。完整语言与 C++ 接入使用原生编译。解释器的支持范围不限制语言要求的编译期求值；后者只调用显式 `const fn` 及其 `const fn` 依赖。

interpret 使用与 check、compile 和原生运行相同的源码收集。必需常量初始化器、`const {}` 块和 `const test` 在分析时执行。随后解释器执行发布的语义操作，并在某个操作的操作数完成、执行到达该操作时检查它是否受支持。支持数值、`bool`、`char`、`str` 和 `String` 局部值；允许的结构体、枚举、固定数组、切片、SIMD 向量与掩码；字节视图与迭代；typed failure 与恢复；直接调用以及通过具名 Carven 函数的局部绑定进行的调用；局部修改、局部指针和 Write 参数；分支、循环、匹配、打印与格式化。保留的 C 字符串值支持文本打印和默认文本格式化。

程序执行必须有顶层可执行语句或 `main` 提供入口。只包含声明、静态测试或内容为空的文件使用 `check`。

typed failure 使用共享执行器：throw、传播、类型匹配 catch、guard 和 rethrow 可以跨普通调用组合。入口失败逃逸会报告执行错误。

驱动拒绝收集到的 `.cpp`，任意收集模块中的原生源码片段都会被拒绝，包括未导入模块。允许 C++ 头文件导入。执行到的原生操作和没有可执行 Carven 函数体的 callable 值报告 `CV-INTERPRET-ADMISSION`，未执行到的不报告。未用函数仍做普通语言检查，但除非声明为 `const fn`（它有自己的能力检查），不要求属于解释执行子集。入口必须无参；`--` 后参数与无参入口一样被忽略。

准入失败为 `CV-INTERPRET-ADMISSION`，不回退原生执行。其他执行失败为 `CV-INTERPRET-EXECUTION`，预算失败为 `CV-INTERPRET-LIMIT`。调用、准入和执行错误返回 1，正常完成遵循入口结果规则；已完成输出保留。断言与运行时 trap 使用带源位置的报告，并中止整个解释运行。

`--trace` 向 stderr 记录解释执行语句位置、调用和成功返回，包含调用缩进，不跟踪前置常量执行，也不记录每个表达式值。程序 stderr 与跟踪共享流。

`--max-steps N` 为非负十进制步数，默认 100,000，嵌套调用共享入口预算；它限制步骤而非耗时或阻塞输出。仍适用单值大小、调用深度、聚合和文本工作限制。前置每个常量 root 的预算独立，选项不改变其限制。重复 `--max-steps`、`--trace` 或 `--tests` 是错误。

必需常量执行与运行时解释使用相同的整数回绕规则。解释执行不写出 C++ 产物或原生可执行文件。浮点算术使用宿主原生环境；浮点打印和格式化遵循原生标准库格式规则。

`interpret --tests` 要求至少一条运行时测试并跳过程序入口。测试按规范模块顺序及模块内源顺序运行，各有新存储和独立 max-steps 预算。失败 check 累积；require/fail 经辅助函数停止当前测试，不能被带类型的 catch 捕获。可恢复的测试停止、不支持的操作、其他执行错误或预算耗尽之后，后续测试继续。失败 assert 或运行时 trap 中止执行，跳过剩余测试且不输出完成汇总；否则报告和 `carven: tests: N passed; M failed` 到 stderr，任意测试失败返回 1。见[报告位置](/zh/reference/entry-testing/#报告位置)。

## 输入路径

路径为 UTF-8，分隔符 `/`，扩展名 `.cv`。相对路径词法归一化后不得越出工作目录；规范模块名由路径去扩展名、以点连接分量。收集文件以已知 Crafts 根确定模块身份，与安装前缀无关；显式别名保留该身份。其他绝对输入须包含 crafts 层级，从首个 crafts 分量起形成模块名。打开文件时操作系统解析符号链接。

每个分量（包括文件名主干）都必须符合标识符形状：`my-file.cv` 会以 `invalid module file stem` 被拒绝。模块分量可以是关键字。同批次不能得到重复规范模块名。导入只解析这些输入。

## compile 产物

| 选项                                               | 行为                                    |
| -------------------------------------------------- | --------------------------------------- |
| 不指定目标                                         | 写到当前目录                            |
| `-o dir` / `--output-dir dir` / `--output-dir=dir` | 写到目标目录                            |
| `--stdout`                                         | 以文件名标题输出到标准输出，无文件 sink |

目标选项最多一种且不能重复。成功分析后按规范路径顺序写文件、创建父目录、覆盖已有文件；首次 I/O 失败停止，之前文件可能已写入。清理旧文件、隔离目录与失败保护由构建系统负责。`--stdout` 只显示属于显式源码输入的产物，以及请求的测试 runner 和入口产物；收集到的依赖（例如内置 UTF Craft）仍以 include 形式出现，并照常参与分析。共享接口含有显式输入时也会显示。stdout 形式用于查看，不是直接可编译的单一 C++ 文件。

产物中的 `.cpp` 保留源码模块路径，内部头文件为 `carven/generated/<模块路径>.hpp`，导出 C++ 接口为 `carven/api/<模块路径>.hpp`。这些前缀让 C++ 使用方明确识别 Carven 头文件。`-o generated` 因而会得到 `generated/carven/generated/…`；外层是输出根，内层是包含路径。

compile 使用共享源码收集，不调用原生编译链接。它也为收集到的 Crafts 模块写出生成实现，例如 `crafts/carven/std/utf/*.cpp`，但不编译也不复制收集到的 `.cpp` 源码；手动构建见[构建与产物](/zh/reference/toolchain/#构建责任)。默认不生成测试产物。`--tests` 是 `--tests=default` 的别名：生成模块测试、runner 和默认测试入口，同时抑制程序入口包装，使全部生成源码可以链接为一个测试可执行程序。`--tests=external` 生成测试和 `carven/generated/carven-test-runner.hpp`，保留程序入口包装，由消费者选择入口及可选 reporter。模式及别名不能重复或组合。生成允许空测试集；执行测试的命令要求至少一条运行时测试。

## 链接域

`--linkage-domain=value` 的等号必需，值非空且仅能出现一次，用于确定私有生成 namespace 的调用者身份。默认由绝对规范产物根导出，stdout 使用当前目录作为虚拟根。显式域与路径域即使字符串相同也身份不同。

同逻辑目标复用域，可能链接到同一映像的不同目标使用不同域。移动输出根会改变默认身份；源码文本、模块集合和顺序、位置不参与域计算。链接域不改变 Carven 名义身份，也不定义公开 C++ ABI。

## 诊断与编译期输出

调用、读取、源码或写入失败向 stderr 报告并返回非零；警告不会使成功编译返回非零。stderr 是终端时，Carven 输出的诊断带颜色；`NO_COLOR` 非空或 `TERM=dumb` 时不带颜色，重定向的 stderr 从不加样式。dump 只解析一个文件，不执行语义分析、常量测试或产物生成；省略类型时，dump 以 `Tokens` 和 `AST` 标题依次输出 token 和语法树。tokens 在词法成功后输出 token，ast 在解析成功后输出树。组合模式的词法错误阻止解析，解析错误保留已输出 token 而不输出 AST。`--timings` 报告已尝试的加载、词法和解析阶段。

必需常量执行的 print/`println` 到 stdout，eprint/eprintln 到 stderr；`compile --stdout` 时所有编译期程序输出改去 stderr，保持 stdout 只包含产物。编译后续失败不撤回已输出内容。增量构建复用产物时不会重新执行或重放编译期输出。

源码诊断在各文件内按源顺序显示。每个函数、测试与 const 块报告首个错误，一次运行可显示独立函数体错误。依赖失败函数的推断结果或失败集合的函数体，在该依赖修好前不另报告。所有函数体通过后，才检查失败契约、所有权并执行静态测试。报告说明期望/实际类型、未声明失败类型或近似拼写；同行标签共享该行，note 与 help 提供上下文及契约对应的源码修改。

编译期执行和解释执行的诊断最多显示八个调用点，并报告额外省略的数量。

## Graver

Graver 是独立的源码格式化工具，不是 `carven` 子命令。在 Carven 仓库根目录运行 `./xmakew build graver` 构建；以下命令也可通过 `./xmakew run graver` 调用。

| 命令                        | 行为                                          |
| --------------------------- | --------------------------------------------- |
| `graver [FILE 或 -]`        | 格式化单个输入到 stdout；省略输入则读取 stdin |
| `graver check FILE/DIR ...` | 在 stdout 列出需要格式化的路径，不写文件      |
| `graver check -`            | 检查 stdin；有差异时报告 `stdin`              |
| `graver write FILE/DIR ...` | 静默替换有变化的文件                          |
| `graver help [COMMAND]`     | 查看帮助或指定命令的帮助                      |

`check` 和 `write` 必须指定输入；当前目录写为 `.`。stdin 必须单独使用，不能用于 write。只有第一个实参识别命令名；默认模式读取同名文件时使用 `./help`、`./check` 或 `./write`。没有选项；包括 `--help` 和 `--` 在内，以短横线开头的实参都是字面路径。

目录递归选择 `.cv` 文件，跳过嵌套的隐藏目录、构建目录和符号链接项；显式文件不限制扩展名。路径排序并去重，检查结果尽可能使用相对当前目录的路径。显式文件符号链接可读取，但 write 拒绝写入。

退出码为 0（成功）、1（check 发现差异）、2（错误）；诊断写到 stderr。整批源码通过词法与语法验证后才报告变化或写入。每个变化文件在目标旁暂存，保留权限位，并在替换前比较原始字节。后续 I/O 失败可能留下已更新的文件；字节比较不锁定文件。未变化文件不重写。

固定风格使用四空格缩进与 100 字节目标行宽；UTF-8 可能较早换行，不可拆分 token、注释、C++ 片段和类型实参可能超宽。保留 token/字面量拼写、导入尾逗号以外的标点、注释文字及 token 间位置、插值文本/规格和 C++ fence 字节；插值孔中的表达式会格式化。多行字符串 token 字节保留语义布局。常量块和静态控制沿用普通块/控制头风格。保留作者空行数量，清除受保留 token 之外的空行空格，普通行尾归一化为 LF，非空输出以换行结束。输出在返回前重新词法分析、比较并解析。

导入选择列表的单行形式在花括号内各留一个空格，不保留尾逗号，如 `using { Point, length }` 和 `using std::{ vector, allocator }`。多行形式每行一个名字，并添加尾逗号；已有尾逗号本身不会强制换行。`::` 与后面的花括号紧邻。这是格式化规则，解析器仍接受可选的尾逗号。

格式化不解析 import、不做类型检查，也不执行编译期函数或测试。格式化成功仅表明源码满足格式化器的语法与保留检查。
