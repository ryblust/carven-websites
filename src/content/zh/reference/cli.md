---
title: "编译器命令"
description: "项目构建、原生运行、解释执行、检查、查询、生成产物和格式化。"
section: reference
lesson: 23
source: docs/toolchain/cli.md
---

用 `carven run main.cv` 构建并运行源码，`carven check main.cv` 检查语义，`carven compile` 生成 C++，`carven interpret` 解释执行支持的操作。`build.cv` 描述项目时，用 `carven build`、`carven run`、`carven test` 和 `carven query` 操作同一项目计划。

## 命令总览

先确保 `carven` 位于 `PATH`，并保留配套工具链资源。相对源码路径以当前目录为基准。

```text
carven build
carven run <source.cv>... [-- <arguments>...]
carven run [<target>] [-- <arguments>...]
carven test [<target>]
carven format [arguments...]
carven query
carven compile [options...] [<input>...]
carven check [options...] [<input>...]
carven interpret [--tests] [--timings] [--trace] [--max-steps N] <source-file>... [-- <arguments>...]
carven dump [tokens|ast] [--timings] <source-file>
```

`carven --help` 和各子命令的 `--help` 显示帮助，`-h` 也可用。`--version` 或 `-V` 输出 `carven v0.1.0` 加换行；无实参时显示帮助并成功退出。Windows Unicode 实参转换为 UTF-8；POSIX 实参含可执行名必须已是有效 UTF-8。空实参保留。

## 项目构建

`carven run main.cv helper.cv -- arguments...` 把显式 `.cv` 源码作为一个原生目标构建，输出为 `build/main`，Windows 为 `build/main.exe`。名称来自第一个文件名，入口由普通语言规则决定，不按文件顺序选择。源码不能与项目目标名混用，程序实参放在 `--` 后。

`carven build` 无参数，解释当前目录的 `build.cv`。项目形式的 `run`、`test`、`query` 也使用该文件，不向父目录搜索。脚本是普通 Carven 程序，可用其他文件名并通过 `carven interpret foo.cv` 执行。

脚本调用 `std::build.project(plan)`：`build` 构建目标，`run` 构建并运行可执行目标，`test` 构建并运行所选目标测试，`query` 输出项目 JSON 而不构建。`std::build.build(plan)` 始终只构建并返回产物，不按命令切换行为。详细字段和依赖规则见[项目构建](/zh/reference/build/)。

省略运行目标时，要求恰有一个可执行产物。测试省略目标时选择全部目标；测试程序包含该目标的显式源码及声明的源码依赖，只选择其中显式根的运行时测试；导入模块不会自动选择该模块的运行时测试。无运行时测试时跳过原生测试构建。静态库保留原生选项和归档边界，测试产物位于输出下 `tests/<target>/`。失败构建或非零程序退出报告构建错误并返回状态 1。

## 项目查询

`carven query` 默认查询 `build.cv`，也接受 `carven query <source-or-artifacts>` 选择其他入口或保留语义目录。保留程序仍重新执行并读取当前宿主输入，调用方须先检查输入新鲜度和分析清单的 `cacheable`。`--timings` 在 `stderr` 报告执行阶段。

查询 JSON 含 `project` 与 `scripts`，提供根、目标、精确源码和监听路径。只解析构建脚本与计划，不分析应用源码，因此应用语法错误不阻止项目发现。脚本的其他语句仍有普通效果；可查询脚本使用一次 `project` 调用，并把 `stdout` 留给 JSON。

## 源码收集

`check`、源码编译和 `interpret` 从显式根开始，根据导入选择项目模块及匹配 Craft 库中的依赖。项目模块按模块路径定位，项目 `crafts/` 和工具链 `crafts/carven/` 提供候选；只有到达的依赖闭包会读取、解析和分析。

规范路径去重，保留绝对物理路径用于诊断与映射，身份冲突报错，候选收集不递归跟随目录符号链接。安装布局为 `<prefix>/bin/carven` 和 `<prefix>/crafts/carven/`，编译器解析真实可执行路径后查找匹配资源。缺失资源表示安装不完整。开发二进制用 `src/carven.cppm` 和 `crafts/carven/` 定位源码树。

### 已安装 Crafts

源包存在只表示可供导入，不让所有文件成为编译根。显式根选择运行时测试，到达模块参与语义检查与静态执行，未使用模块不产生诊断或效果。

Craft 的普通 `build.cv` 描述实现组和链接要求，编译清单包含其查询结果。消费构建系统按自己的目标配置选择并编译原生源码。子目录通过函数和导入组合，由当前构建入口显式组装，不递归执行每个 `build.cv`。

## 语义检查

`check` 分析所选依赖闭包，执行必需常量初始化、常量块及静态测试，不要求程序入口。普通函数与运行时测试只检查，不执行。无 `-o` 时不写产物；`-o <dir>` 保存保留语义及清单供后续生成。

接受至少一个源码或保留语义输入，以及 `-o`、`--timings`、独立帮助选项。检查不选择原生链接域；原生重载、模板和委托类型检查在 C++ 编译中完成。成功返回 0，包括只有警告的情况；输入、调用或分析失败返回 1。成功时只产生源码要求的输出及诊断，不额外输出固定的成功消息。

## 阶段计时

`check`、`compile`、`interpret`、`dump` 接受 `--timings`，在 `stderr` 报告结果、总耗时、已执行阶段及占比。语义分析时间包含静态执行，嵌套细分不能再次加到总数中。失败命令报告已尝试阶段，无效命令选项不生成计时报告。

`build`、`run`、`test` 不接受顶层 `--timings`。计时为人工阅读，程序及产物流保持原用途。

## 直接原生运行

`carven run` 通过标准构建库构建，要求目标有一个入口。`CXX` 指定单个原生编译器可执行路径，未设置或为空时在 `PATH` 找 `clang++`，不能在变量中附加 shell 选项。参数使用 GCC/Clang 风格，以 C++20 为基线，环境还须提供 SDK 和链接器。

生成代码、对象与依赖保留在计划输出目录，默认为 `build/`。子进程继承目录、环境和标准流，不经过 shell。POSIX 信号终止对应的子进程状态为 `128 + signal`；`carven run` 将非零子进程状态报告为构建错误，自身返回 1。`compile --tests` 为消费构建生成原生测试产物，`interpret --tests` 直接运行支持的测试。

## 解释执行

解释器先做普通分析和静态执行，再执行发布程序，不生成 C++；程序本身显式调用 `std::compiler` 或 `std::build` 时可以生成产物。执行程序要求输入批次恰有一个入口，`check`、`compile` 则可同时处理多个各自带入口的模块。

支持源函数、局部存储、聚合、元组、`Vector`、文本、闭包与可调用视图、控制流、失败、局部指针，以及已实现的异步组合、输入、时钟和等待。命名 `const fn` 在定义时检查静态能力，普通函数中的不支持操作在实际到达时诊断。

标准库的原生功能通过编译进宿主的类型化绑定执行；其他原生实现需要显式宿主绑定或原生运行。头文件和源片段不阻止解释，但解释器不编译、加载原生源码，也不执行未链接提供者的全局初始化或析构。解释入口必须无参数，`--` 后实参不传给入口；`std::process.arguments` 查询解释宿主的全部实参，不含可执行名。

显式静态调用在分析阶段操作编译器宿主，普通调用在执行阶段操作宿主。同一编译器进程保留静态输入到解释阶段的预读字节、EOF 与系统错误。

`--trace` 在 `stderr` 报告解释阶段的语句、调用和成功返回，不记录每个表达式，也不跟踪此前静态执行。普通 CLI 解释默认没有累计工作配额；`--max-steps N` 设置非负十进制步数，零不允许执行。嵌套调用共享预算，每个运行时测试有独立预算；不限制经过时间或 I/O 等待。值大小、聚合深度与调用深度限制仍适用，静态根和宿主调用有自己的预算。

`interpret --tests` 按规范模块顺序及模块内源顺序执行运行时测试，跳过入口并要求至少一项运行时测试。`check` 失败累积，`require`、`fail` 停止当前测试并清理子任务，不能被类型化 `catch` 捕获。普通执行错误或预算耗尽后继续下一测试；断言或运行时陷阱停止整个执行，不输出完成汇总。正常结束在 `stderr` 输出通过/失败数，有测试失败则状态 1。

## 输入路径

源码使用 UTF-8、`/` 和 `.cv`，根相对路径决定模块名，例如 `src/main.cv` 为 `src.main`，`crafts/json/io.cv` 为 `crafts.json.io`。`json::parser` 选择项目源包，保留的 `std::` 选择官方 `carven` Craft。

应用相对或绝对路径均通过文件系统解析，须位于当前项目根内。已知工具链文件按所属根确定模块身份，不受安装前缀影响。派生路径组件须符合 `[A-Za-z_][A-Za-z0-9_]*`，可用关键字作为组件。规范路径识别同一文件，不同文件不能派生相同模块路径。

`compile`、`check` 和 `interpret` 的位置实参选择所属源码根；导入会从候选模块中加载可达的项目与 Craft 依赖，不要求把所有依赖都列为输入。显式根决定运行时测试和产物展示的选择。

## compile 产物

`check -o <dir>` 写保留语义与清单。`compile` 默认写当前目录，`-o <dir>` 选择输出目录，`--stdout` 用于人工查看，各种目标选项不能重复或混用。无输入的 `compile -o <dir>` 只写工具链资源及空输入、产物列表，不分析标准库或生成 C++，用于纯原生消费者；`check` 仍须输入。

成功后写产物与 `carven/manifest.json`，创建父目录并截断已有文件。I/O 失败时此前写入可能已生效；隔离目录、清理旧文件、失败保护和按内容保持时间戳由调用方负责。

`--stdout` 按规范顺序展示显式输入或保留产物中所属输入的 C++，每个产物有 `==> logical/path <==` 标题。依赖保留为 include，这不是可直接送入 C++ 编译器的串接格式。正式构建使用目录中的独立文件。

源码编译为已加载闭包生成实现；显式输入选择运行时测试和展示内容。普通生成保留按源模块分开的实现。

`compile --no-query` 跳过 Craft 声明查询，清单仍保留 `craft_roots`，`crafts` 为空。消费方可在各 Craft 目录分别 `check build.cv -o <checked>` 和 `query <checked>`，独立刷新原生要求。查询仍重新执行脚本，保留语义只跳过前序分析和静态执行。

### 复用已检查程序

仅以保留语义目录为输入时，`compile` 直接从已检查程序生成 C++，不重新解析、分析源码或执行静态工作。同一分析结果可用于普通产物和测试产物：

```sh
carven check main.cv -o build/checked
carven compile build/checked -o build/program
carven compile build/checked --tests -o build/tests
```

已检查 Craft 的产物目录也可与新源码一起输入。保留的定义提供泛型和分阶段函数体，涉及消费者类型的新实例与检查属于本次分析。保留模块继续由外部产物提供实现，不能在新批次中重复定义；单独使用产物目录则保留原程序的源码根与实现归属。调用方负责确认依赖和编译器的新鲜度。

<span id="链接域"></span>

### 清单

清单记录已加载输入、产物、运行时测试数、可缓存性、`include_dirs`、`library_roots`、`craft_roots` 和查询的 `crafts`。输入标记显式根 `owned`、工具链身份 `standard` 和本次生成外的实现所有权 `external`。产物及链接依赖相对于目标目录，源路径相对于 `workspace.root`，外部源为绝对路径。

观察宿主输入、时间、等待或显式环境效果的分析不可缓存。加载内容、编译器、选项和候选模块名都参与分析新鲜度，未使用候选的内容不使分析失效。保留输入不是自动缓存管理器，调用方负责验证。

## 测试产物

`compile --tests` 生成所选模块测试、runner 和测试入口，替换 Carven 程序入口。`--tests=runner` 只生成 runner，由消费者提供入口；两者不能重复混用。生成模式允许空测试集；`interpret --tests` 要求至少一项运行时测试，项目的 `carven test` 则跳过没有运行时测试的目标。手写 C++ `main` 是普通原生源码，测试目标应排除它。

## 语法检查与输出

`dump` 不分析语义、不解析导入、不执行静态根或测试。`dump tokens` 只词法分析，`dump ast` 在词法和语法都成功后输出树，不指定种类时组合显示。词法或语法失败使命令失败，输出供人工阅读。

<span id="诊断与编译期输出"></span>

## 编译期输出

编译期 `print`、`println` 写 `stdout`，`eprint`、`eprintln` 写 `stderr`。`--stdout` 时全部编译期程序输出转到 `stderr`，把 `stdout` 留给生成产物。输出随执行发生，后续失败不撤回；复用产物不重放编译期输出。

## carven-format

`carven format` 从解析后的编译器所在目录启动配套 `carven-format`，保留实参、目录、标准流与退出码，不搜索 `PATH` 或自动构建缺失工具。源码开发须单独构建格式化器。

```sh
carven format main.cv
carven format check src
carven format write src
```

也可直接调用 `carven-format`。无输入时读 `stdin`，检查到布局差异返回 1，格式化错误返回 2。格式化后继续语义检查和测试。
