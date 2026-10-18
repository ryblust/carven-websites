---
title: "构建与原生集成"
description: 宿主要求、目标 C++20、Xmake 批次、生成接口和运行时支持。
section: reference
lesson: 24
source: docs/toolchain/artifacts.md
---

原生程序的构建分三步：Carven 检查源码并生成 C++，C++ 编译器编译这些文件，链接器再把它们与运行时支持和原生库组合起来。项目中通常由 Xmake 协调这几步。本页用于配置构建时查阅产物、依赖及版本要求。

## 宿主与目标

构建 Carven 编译器本身需要 C++26，并关闭异常与 RTTI；生成的程序和安装的 Crafts 最低要求 C++20。项目选择自己的 C++ 标准，运行时按特性检测使用较新的设施。

编译器跨平台使用 LLVM/Clang 与 libc++，Windows 由 LLVM-MinGW 提供，验证版本为 LLVM 23。宿主和目标的 isize/usize 数据模型须一致；f32/f64 要求 IEEE binary32/binary64，原生编译选项须保留相等与求值顺序。

Carven 分析成功后，C++ 仍检查原生声明、构造、重载、模板和转换，链接器检查定义是否齐全。含原生 throw/try/catch 的片段须为该翻译单元启用异常。原生聚合中不可移动类型的构造限制见 [C++ 构造与转换](/zh/reference/interop/#类型构造与转换)。

## 构建责任

compile 写出生成文件，不编译或复制收集到的 cpp。手动构建须选择目标需要的生成实现及原生实现，并提供生成目录和安装支持根的头文件搜索路径、所需原生源文件及链接库。头文件导入不会自动添加搜索目录或链接输入。直接运行命令则在临时目录编译生成实现和收集到的原生源。

Xmake 管理准备顺序、头文件扫描、编译、链接及并行。Carven 规则提供生成源，并保留原始 cv 文件附带的原生设置。规则把完整标准库的生成实现和安装的原生支持源文件加入各个使用它们的目标，由 Xmake 按该目标的原生配置编译并复用未变化的对象文件。应用自己的依赖配置在应用目标上。安装布局中 crafts 与 bin 并列。Windows TCP 实现的 Winsock 依赖由规则提供，手动构建须链接 `ws2_32`。

## Xmake 项目配置

```lua
add_repositories("carven-xmake-repo https://github.com/ryblust/carven-xmake-repo.git")
add_requires("carven")

target("app")
    set_kind("binary")
    add_rules("@carven/carven")
    add_files("src/**.cv")
```

使用 Xmake 3.1.1 或更新版及支持 C++20 的工具链。应用项目运行 `xmake build`、`xmake run app` 和 `xmake test`。xmake test 也可以作为首次构建命令。规则发现选定源文件里的运行时测试，仅为非空结果注册测试程序；普通应用构建保留入口，不包含运行时测试代码。

需要自选测试源或入口时，声明显式测试目标。例如，含手写 C++ 入口的应用可关闭自动测试目标，再单独选择测试源：

```lua
target("app")
    set_kind("binary")
    add_rules("@carven/carven", {tests = false})
    add_files("src/*.cv", "src/*.cpp")

target("app-tests")
    set_default(false)
    set_kind("binary")
    add_rules("@carven/carven", {tests = true})
    add_files("src/*.cv", "src/*.cpp")
    remove_files("src/main.cpp")
    add_tests("default")
```

```shell
xmake build app-tests
xmake test 'app-tests/*'
```

`tests = false` 关闭应用的自动测试目标，`tests = true` 生成测试入口，`tests = {entry = false}` 只提供测试运行器给手写入口。用 `add_tests` 注册执行。生成入口替换原生入口时，排除手写 main.cpp；含 Carven 入口和内联测试的 cv 应保留，编译器会替换它的入口包装函数。

规则获取匹配的 compiler/Crafts，收集项目 crafts，并提供两处头文件搜索根。目标源码的模块路径相对于项目根目录，去掉 `.cv` 后，每个路径组件须符合 `[A-Za-z_][A-Za-z0-9_]*`。原生实现通过普通目标设置和依赖配置。

Xmake 负责目标依赖、原生配置、准备顺序、头文件扫描、编译、链接与并发。Carven 规则提供生成源码，并保留对应 `.cv` 文件的原生设置。规则处理完整的已安装标准库，为每个使用标准库的目标注册其生成实现和已安装的原生支持源码。Xmake 按各目标的原生设置编译这些源码并管理增量构建；原生产物的复用遵循 Xmake 自身的条件。

相同源码批次共享已检查的程序。每个应用目标在自己的输出目录中生成应用 C++ 和入口。在同一个已配置的 Xmake 项目内，使用相同 Carven 编译器和已安装源码的目标共享标准库分析结果及生成 C++ 文本；标准库在这些目标间保持固定的生成符号身份。

共享生成文本不会在链接时自动消除重复的原生定义。交换生成类型的组件须使用兼容的原生 ABI 设置。运行时状态是否共享遵循 C++ 定义和平台符号绑定规则，分别链接的库不保证共享同一个运行时实例。

分析如果读取输入、时钟或等待，下次构建请求会重新执行。规则先写暂存目录，成功后发布；内容相同的文件保留时间戳。依赖记录跟踪编译器、源、依赖产物、参数和输出。安装 Craft 文件增加或删除后，重新配置项目。

## 产物路径

```text
carven/manifest.json
carven/generated/<linkage-domain>/<component-anchor>.hpp
carven/api/<canonical-module-path>.hpp
carven/providers/<canonical-module-path>.hpp
<canonical-module-path>.cpp
carven/generated/carven-test-runner.hpp
carven/generated/carven-test-main.cpp
```

`check -o` 保存已检查程序的语义中间表示（IR）和 manifest。compile 可以直接从这个目录生成 C++，无需重新分析或执行编译期工作。只有标准库的产物目录还可给新批次提供已检查的泛型与静态函数定义，新实例由使用这些定义的项目进行分析。构建系统负责判断这些依赖是否仍与源码、编译器一致。

通过完整定义依赖关联起来的声明归入同一个接口组件，共享一个生成头文件；文件名中的 `<component-anchor>` 使用该组中第一个规范模块名。没有公开声明的模块无需独立组件头。实现文件按规范模块路径生成。模块调用的新静态实例写进调用方实现，不要求修改原定义模块的产物。

`carven/api` 头包含 export(cpp) 声明，位于 `carven::api` 及其下按模块路径编码的命名空间；包装函数定义位于实现文件。`carven/providers` 头提供 import(cpp) 签名所需的类型别名和完整依赖，不声明原生函数。

头导入在所属模块内保留原始顺序和重复项，跨模块按稳定顺序排列，不重现任意宏配置顺序。C++ 源码片段只写入实现文件，位于 include 之后、生成命名空间之前。生成实现先包含自己的组件头，测试入口先包含运行器头；其他依赖按所属组整理。生成头使用 pragma-once。

项目链接身份由输出目录、规范模块路径和测试模式共同确定，各应用目标使用独立的应用生成目录；改变目标的源码成员不会改变该目录。标准库保持编译器定义的链接身份，Xmake 规则在单独的目录共享其生成文本。公开 API 名字属于全程序的 `carven::api`，分别链接的模块应使用不同规范路径，共享定义通过原生库依赖复用。构建系统负责旧产物清理、安装及原生调度。

| manifest 字段        | 意义                                           |
| -------------------- | ---------------------------------------------- |
| `workspace.root`     | 调用时的工作目录                               |
| `inputs`             | 源路径、模块身份、归属和标准库标记             |
| `artifacts`          | 相对输出路径、角色、源映射及实现所属源         |
| `runtime_test_count` | 本次拥有的模块中的运行时测试数，与生成模式无关 |
| `cacheable`          | 分析是否未观察输入、时间或等待                 |

工作区内输入用相对路径，外部输入用绝对路径。产物角色包括 `interface`、`cpp-api-header`、`module-implementation`、`test-runner-header`、`test-entry` 和 `semantic-ir`。源映射标记为 `stable-interface` 或 `source-attributed`；合成输出没有所属源文件。C++ 头依赖由原生编译器的依赖文件跟踪。

## 运行时支持

运行时头文件按能力分组，可直接供生成代码和原生调用方使用：

```text
carven/runtime/call/callable.hpp
carven/runtime/call/passing.hpp
carven/runtime/collection/array.hpp
carven/runtime/collection/range.hpp
carven/runtime/collection/slice.hpp
carven/runtime/collection/vector.hpp
carven/runtime/diagnostics/observe.hpp
carven/runtime/diagnostics/report.hpp
carven/runtime/diagnostics/trap.hpp
carven/runtime/display/display.hpp
carven/runtime/execution/child.hpp
carven/runtime/execution/clock.hpp
carven/runtime/execution/completion.hpp
carven/runtime/execution/composition.hpp
carven/runtime/execution/entry.hpp
carven/runtime/execution/execution.hpp
carven/runtime/execution/time.hpp
carven/runtime/execution/timeout.hpp
carven/runtime/execution/unreachable.hpp
carven/runtime/format/format.hpp
carven/runtime/format/writer.hpp
carven/runtime/io/cursor.hpp
carven/runtime/io/print.hpp
carven/runtime/io/queue.hpp
carven/runtime/io/stdin.hpp
carven/runtime/numeric/float.hpp
carven/runtime/numeric/numeric.hpp
carven/runtime/numeric/parse.hpp
carven/runtime/simd/simd.hpp
carven/runtime/testing/testing.hpp
carven/runtime/text/text.hpp
carven/runtime/text/utf8.hpp
carven/runtime/value/deferred.hpp
carven/runtime/value/outcome.hpp
carven/runtime/value/stateless.hpp
carven/runtime/value/tuple.hpp
carven/runtime/value/void.hpp
```

各头文件直接包含自己的依赖；生成代码选择所需符号所属的头文件。原生异步实现遵循 [provider 与宿主契约](/zh/reference/async/#原生提供者与宿主)。

`call/passing.hpp` 提供原生参数与转移支持，`execution/entry.hpp` 提供进程实参与入口失败报告。`diagnostics/trap.hpp` 为运行时检查失败保留源码位置；`testing/testing.hpp` 在 `carven::runtime` 中提供内联测试上下文、失败记录和报告。

`text/text.hpp` 提供 String、文本视图、UTF-8 校验、标量编解码及原生表示转换，实现分布在 `string.hpp`、`view.hpp` 和 `utf8.hpp`。`format/format.hpp` 提供普通插值，`format/writer.hpp` 提供内建类型的 FormatWriter，`display/display.hpp` 提供结构化打印。`io/print.hpp` 按项目所选标准使用 C++20 实现或可用的 C++23 print 支持。委托给原生的格式字符串及 formatter 可用性由 C++ 编译器检查。

使用与编译器版本匹配的 Crafts 和运行时头。源码层的格式化与输出规则见[格式化参考](/zh/reference/formatting/)。

原生代码直接调用 String 的 from_str/append 时，必须提供有效 UTF-8；push 需要合法 Unicode 标量。原生 from_utf8 会检查输入并在无效时终止，这与源标准库返回类型化失败的接口不同。运行时 String 操作支持 C++20 常量求值。保留的 Carven String 和 Vector 常量使用不可变底层存储与原生 constexpr 描述符；Read 不分配，运行时复制产生独立所有者。TCP 的 C++ 实现需要原生执行；编译期和解释执行的输入、时间等能力由各自的执行实现提供。

## SIMD 配置

C++20 运行时为每个翻译单元选择一个后端：可用时使用 AArch64 NEON，x86 在应用启用 AVX2 时使用 AVX2，否则使用 portable。各后端保持相同逻辑通道运算。

x86 使用 `-mavx2`、`/arch:AVX2` 或 Xmake 的 `add_vectorexts("avx2")` 启用 AVX2，定义 `CARVEN_SIMD_FORCE_PORTABLE` 强制 portable。共享 SIMD 或运行时文本类型及内联定义的翻译单元必须选择同一后端。独立程序可选择不同后端。

向量和掩码类型位于 `carven::runtime::simd` 下后端专属的 inline namespace。某些带这些类型的编码符号会暴露后端不一致，但仅返回类型或包含这些类型的结构体未必使链接器发现差异，链接成功不能替代一致配置。
