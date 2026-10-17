---
title: "编译器命令与 carven-format"
description: 原生运行、解释执行、生成产物与 carven-format 源码格式化。
section: reference
lesson: 24
source: docs/toolchain/cli.md
---

本地运行源码用 `carven main.cv`；只检查程序用 `carven check main.cv`；需要生成 C++ 时用 compile；不经过原生 C++ 构建、直接执行受支持的 Carven 操作时用 interpret。check 仍会执行源码要求的编译期工作。下面说明各命令如何收集输入、写出产物和复用已检查程序。

## 命令总览

```sh
carven main.cv -- argument
carven --tests main.cv
carven check --timings main.cv
carven check main.cv -o build/checked
carven compile build/checked -o build/program
carven compile build/checked --tests -o build/tests
carven compile --stdout main.cv
carven interpret --trace --max-steps 100000 main.cv
carven interpret --tests main.cv
carven dump tokens main.cv
carven dump ast main.cv
```

支持顶层与各命令 help、-h、--version/-V，无参数打印帮助并成功。

## 源码收集

普通源调用把显式应用 cv 与匹配工具链 crafts/carven、工作目录可选 crafts 中递归收集的 cv/cpp 合并。源批次至少有一个显式 cv。import 只在目录内解析，不发现或下载文件。目录 symlink 不递归，按规范物理路径去重，规范模块身份冲突非法。

所有收集源均检查并执行静态根与静态测试，即使未导入；收集根内的 examples/tests 也参与。安装包须可共同构建，独立入口示例或故意无效测试应在收集根外。外部仓库可放 thirdparty 并显式选择 cv，原生源、头、宏、选项和库由构建系统提供。

## 语义检查

check 完成语义分析、必需 const/常量块/const test，不要求入口，不执行普通函数或运行时测试。无 -o 不写产物，`-o dir` 保留语义 IR 与 manifest；不生成 C++，不选择原生链接域。C++ 仍检查原生重载、模板与类型属性。

check 接受源或保留语义目录、--source 映射、-o、--timings。成功状态 0 并在 stderr 打印 carven: check passed，错误状态 1，警告不改变成功。

## 阶段计时

check/compile/interpret/dump/直接运行支持 --timings，在 stderr 显示结果、总墙钟时间和尝试阶段，包括失败。分析含静态执行，原生运行还含 C++ 编译链接；总时间含准备诊断清理，可能大于阶段和。无效选项不报告，程序和产物流保持原用途。

## 直接原生运行

裸源命令分析、生成 C++，在独立系统临时目录编译全部生成实现与收集的原生源，再运行；不依赖 Xmake。CXX 是单个编译器名或路径，默认 clang++，不由 shell 拆参数。请求 C++20，MSVC 风格驱动与 GCC 风格驱动分别使用对应参数，SDK/链接器环境由调用者准备。

安装 bin/carven 与匹配 crafts/carven 同根；临时运行目录执行后清理，强制终止可留下目录。子进程继承 cwd 与标准流。-- 后参数按原样传程序，包括空参数、空格和引号。程序须有一个入口，原生编译/程序失败状态透传，POSIX 信号映射 128 + signal。复杂依赖及增量构建使用外部构建系统。

--tests 运行普通测试并跳过程序入口，要求至少一条运行时测试；编译期测试仍先执行。check 累积失败，require/fail 停当前测试，后续继续；assert/trap 中止执行，任意失败状态非零。

## 解释执行

解释器执行支持的 Carven 语义操作，到达不支持操作才诊断。unused 函数仍普通检查，只有 const fn 须在定义处证明静态能力。解释先完成正常分析及静态执行，再执行已发布程序；不写 C++ 或原生可执行文件。

支持局部值、聚合、元组、Vector、文本、字符遍历、控制流、失败、局部指针和支持的异步组合，也支持输入配置/读取、采时、等待和 deadline。显式 const 在 check、compile、原生运行准备及 interpret 分析阶段执行相同宿主工作，普通调用在运行阶段执行。同一编译器进程的输入 cursor 保留预读字节、EOF 与系统错误，从静态根延续到后续解释。

收集的 cpp、头导入与源片段不阻止解释；解释器不编译/加载它们，也不运行 C++ 静态对象初始化/析构。到达原生操作或缺少可执行实现的可调用值时报告 CV-INTERPRET-ADMISSION。依赖原生副作用的程序须原生运行。当前 CLI 规范仍要求解释入口无参数，-- 后参数由无参入口忽略。

--trace 在 stderr 输出运行语句位置、调用与成功返回，不跟踪前面的静态执行或每个表达式。--max-steps N 为非负十进制，默认 100,000，嵌套调用共享预算；限制步数而非墙钟或阻塞 I/O。值、文本、聚合和深度预算仍适用，静态根各自独立且不受该选项影响。重复 --trace/--tests/--max-steps 非法。

interpret --tests 按规范模块及同模块源码顺序运行，每个测试有新存储和独立预算。require/fail 的停止不是可 catch 失败。普通执行错误/超限停止当前测试并继续后续，assert/trap 中止整个运行且无完成汇总；正常结束向 stderr 报 passed/failed 数。

## 输入路径

源路径用 UTF-8、/ 和 cv 扩展名。相对路径词法归一化后不可逃出 cwd，去扩展并以点连接组件得到模块名。每个组件须形如标识符，可为关键字。收集的工具链文件按已知 Crafts 根确定身份，不随安装前缀变；其他绝对路径要求 crafts 层级。

compile/check 支持重复的 `--source=<canonical-module>=<path.cv>`，可与位置源混用。至少提供一项位置输入或映射。映射独立于物理路径决定身份，例如 --source=app.main=/work/src/main.cv；这种调用选择完整 owned 输入，加载工具链而不自动发现 project Crafts。相同物理文件去重，一个文件冲突身份或不同文件重复模块身份被拒绝。

## compile 产物

check -o 写语义 IR 与 carven/manifest.json。compile 默认 cwd 或 -o 目录写 C++ 和 manifest，--stdout 仅显示检查用文件标题与内容，不写文件、manifest 或 IR。目的地选项只能一项且不可重复。写入创建父目录、覆盖旧文件，首个 I/O 失败停止，前面文件可能已改；隔离、旧文件清理与发布保护由构建系统负责。

compile 只为 owned 输入生成实现：显式源和 project Crafts 为 owned，自动工具链源为依赖；显式提供安装源可使其成为 owned。--stdout 展示显式/目录 owned 产物、所需共享接口与请求的测试入口；依赖仍为 include。该输出不是一个可直接编译的 C++ 文件。

单独传保留分析目录时从已发布程序生成，不重新解析/分析或重复静态执行。同一 checked 程序可生成普通或测试程序。仅含标准库的 artifact 目录也可伴随新源；其 checked 定义提供泛型与静态体，消费者负责新实例检查，不能重定义标准模块。构建系统负责源和编译器的新鲜度。

manifest 描述输入、产物、拥有关系、runtime_test_count 和 cacheable。分析观察宿主输入、时间或等待后 cacheable: false。使用暂存路径、检查状态后发布。

## 链接域

项目链接身份组合生成目的地、规范模块路径与测试模式，接口路径包含相应域。每个原生 target 拥有输出目的地，源成员变化不改变目的地；工具链标准库保持编译器确定身份。公开 export(cpp) 在全程序 carven::api 下，分别链接模块须有独立规范路径；共享库通过原生依赖复用。

## 测试产物

compile 默认不生成运行时测试。--tests 生成模块测试、runner 头与测试入口，并抑制程序 entry wrapper；--tests=runner 仅测试与 runner，保留程序 wrapper，由消费者选入口和 reporter。模式互斥不可重复。生成允许空测试集，执行要求非空。

## 诊断与编译期输出

错误到 stderr 并返回非零，警告不使成功失败。终端默认颜色，NO_COLOR 非空或 TERM=dumb 时无颜色，重定向无颜色。const print/println 到 stdout，eprint/eprintln 到 stderr；compile --stdout 将所有静态程序输出转 stderr，保留 stdout 给产物。后续失败不撤销已完成输出，复用保留产物不重放静态输出。

dump 只加载/lex/parse 一个文件，不分析、静态测试或生成产物；默认 Tokens 后 AST，tokens/ast 单独选输出。词法失败停止 parse，语法失败仍保留已打印 tokens。静态及解释执行诊断最多列八个调用点，并汇总省略数。源码错误按文件中顺序，每个函数/测试/const 块首错独立报告，依赖失败推断的体待依赖修复。

## carven-format

carven-format 是独立的源码格式化工具，不是 `carven` 子命令。在 Carven 仓库根目录运行 `./xmakew build carven-format` 构建；以下命令也可通过 `./xmakew run carven-format` 调用。

| 命令                               | 行为                                          |
| ---------------------------------- | --------------------------------------------- |
| `carven-format [FILE 或 -]`        | 格式化单个输入到 stdout；省略输入则读取 stdin |
| `carven-format check FILE/DIR ...` | 在 stdout 列出需要格式化的路径，不写文件      |
| `carven-format check -`            | 检查 stdin；有差异时报告 `stdin`              |
| `carven-format write FILE/DIR ...` | 静默替换有变化的文件                          |
| `carven-format help [COMMAND]`     | 查看帮助或指定命令的帮助                      |

`check` 和 `write` 必须指定输入；当前目录写为 `.`。stdin 必须单独使用，不能用于 write。只有第一个实参识别命令名；默认模式读取同名文件时使用 `./help`、`./check` 或 `./write`。没有选项；包括 `--help` 和 `--` 在内，以短横线开头的实参都是字面路径。

目录递归选择 `.cv` 文件，跳过嵌套的隐藏目录、构建目录和符号链接项；显式文件不限制扩展名。路径排序并去重，检查结果尽可能使用相对当前目录的路径。显式文件符号链接可读取，但 write 拒绝写入。

退出码为 0（成功）、1（check 发现差异）、2（错误）；诊断写到 stderr。整批源码通过词法与语法验证后才报告变化或写入。每个变化文件在目标旁暂存，保留权限位，并在替换前比较原始字节。后续 I/O 失败可能留下已更新的文件；字节比较不锁定文件。未变化文件不重写。

固定风格使用四空格缩进与 100 字节目标行宽；UTF-8 可能较早换行，不可拆分 token、注释、C++ 片段和类型实参可能超宽。保留 token/字面量拼写、导入尾逗号以外的标点、注释文字及 token 间位置、插值文本/规格和 C++ fence 字节；插值孔中的表达式会格式化。多行字符串 token 字节保留语义布局。常量块和静态控制沿用普通块/控制头风格。作者空行最多连续保留一行，清除受保留 token 之外的空行空格，普通行尾归一化为 LF，非空输出以换行结束。输出在返回前重新词法分析、比较并解析。

导入选择列表的单行形式在花括号内各留一个空格，不保留尾逗号，如 `using { Point, length }` 和 `using std::{ vector, allocator }`。多行形式每行一个名字，并添加尾逗号；已有尾逗号本身不会强制换行。`::` 与后面的花括号紧邻。这是格式化规则，解析器仍接受可选的尾逗号。

格式化不解析 import、不做类型检查，也不执行编译期函数或测试。格式化成功仅表明源码满足格式化器的语法与保留检查。

当前固定样式展开非空 struct/enum 与多字段具名构造；相邻布局相同且不超宽的单行构造按列对齐；不同顶层项类别之间分隔。作者空行最多连续保留一行，定界符内没有注释的边缘空行移除。完整样式定义见主仓库 tools/format/README.md。
