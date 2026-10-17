---
title: 构建、产物与原生集成
description: 宿主要求、目标 C++20、Xmake 批次、生成接口和运行时支持。
section: reference
lesson: 25
source: docs/toolchain/artifacts.md
---

原生程序的构建分三步：Carven 检查源码并生成 C++，C++ 编译器编译这些文件，链接器再把它们与运行时支持和原生库组合起来。项目中通常由 Xmake 协调这几步。本页用于配置构建时查阅产物、依赖及版本要求。

## 宿主与目标

构建 Carven 编译器本身需要 C++26，并关闭异常与 RTTI；生成的程序和安装的 Crafts 则最低只要求 C++20。二者不要混淆。项目选择自己的 C++ 标准，运行时按特性检测使用较新的设施。

编译器跨平台使用 LLVM/Clang 与 libc++，Windows 由 LLVM-MinGW 提供，验证版本为 LLVM 23。宿主和目标的 isize/usize 数据模型须一致；f32/f64 要求 IEEE binary32/binary64，原生编译选项须保留相等与求值顺序。

Carven 分析成功后，C++ 仍检查原生声明、构造、重载、模板和转换，链接器检查定义是否齐全。含原生 throw/try/catch 的片段须为该翻译单元启用异常。较早构造的原生聚合成员若需跨后续失败保存，最终组装可能需要复制或移动；不可移动类型可能在这一步编译失败，即使直接在最终位置构造本来可行。

## 构建责任

compile 写出生成文件，不编译或复制收集到的 cpp。手动构建须选择目标需要的生成实现、标准库归档及原生实现，并提供生成目录和安装支持根的头文件搜索路径、所需原生源文件及链接库。头文件导入不会自动添加搜索目录或链接输入。直接运行命令则在临时目录编译生成实现和收集到的原生源。

Xmake 管理准备顺序、头文件扫描、编译、链接及并行。Carven 规则提供生成源，并保留原始 cv 文件附带的原生设置。标准库归档包含标准实现与原生支持；应用自己的依赖配置在应用目标上。安装布局中 crafts 与 bin 并列。Windows TCP 实现的 Winsock 依赖由规则提供，手动构建须链接 `ws2_32`。

## Xmake 消费项目

```lua
add_repositories("carven-xmake-repo https://github.com/ryblust/carven-xmake-repo.git")
add_requires("carven")

target("app")
    set_kind("binary")
    add_rules("@carven/carven")
    add_files("src/**.cv")
```

使用 Xmake 3.1.1 或更新版及支持 C++20 的工具链。应用项目运行 `xmake build`、`xmake run app` 和 `xmake test`；主仓库开发使用 `./xmakew`。xmake test 也可以作为首次构建命令。规则发现选定源文件里的运行时测试，仅为非空结果注册测试程序；普通应用构建保留入口，不包含运行时测试代码。

需要自选测试源或入口时，声明显式测试目标。`tests = false` 关闭应用的自动测试目标，`tests = true` 生成测试入口，`tests = {entry = false}` 只提供测试运行器给手写入口。用 `add_tests` 注册执行。生成入口替换原生入口时，排除手写 main.cpp；含 Carven 入口和内联测试的 cv 应保留，编译器会替换它的入口包装函数。

规则获取匹配的 compiler/Crafts，收集项目 crafts，并提供两处头文件搜索根。相同源码批次可以共享分析结果，但每个原生目标仍在自己的输出目录生成 C++ 和入口。标准库代码保持固定链接身份，并按原生归档配置生成。

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

`check -o` 保存已检查程序的语义中间表示（IR）和 manifest。compile 可以直接从这个目录生成 C++，无需重新分析或执行编译期工作。只有标准库的产物目录还可给新批次提供已检查的泛型与静态函数定义，新实例由消费者分析。构建系统负责判断这些依赖是否仍与源码、编译器一致。

需要彼此完整定义的声明组成一个接口组件，共享一个生成头文件；文件名的 anchor 取该组中第一个规范模块名。没有公开声明的模块无需独立组件头。实现文件按规范模块路径生成。模块调用的新静态实例写进调用方实现，不要求修改原定义模块的产物。

`carven/api` 头包含 export(cpp) 声明，位于 `carven::api` 及其下按模块路径编码的命名空间；包装函数定义位于实现文件。`carven/providers` 头提供 import(cpp) 签名所需的类型别名和完整依赖，不声明原生函数。

头导入在所属模块内保留原始顺序和重复项，跨模块按稳定顺序排列，不重现任意宏配置顺序。源片段只进入实现文件，位于 include 之后、生成命名空间之前。生成实现先包含自己的组件头，测试入口先包含运行器头；其他依赖按所属组整理。生成头使用 pragma-once。

项目链接身份由输出目录、规范模块路径和测试模式共同确定，各原生目标使用独立目录。公开 API 名字属于全程序的 `carven::api`，分别链接的模块应使用不同规范路径，共享定义通过原生库依赖复用。构建系统负责旧产物清理、安装及原生调度。

| manifest 字段        | 意义                                           |
| -------------------- | ---------------------------------------------- |
| `workspace.root`     | 调用时的工作目录                               |
| `inputs`             | 源路径、模块身份、归属和标准库标记             |
| `artifacts`          | 相对输出路径、角色、源映射及实现所属源         |
| `runtime_test_count` | 本次拥有的模块中的运行时测试数，与生成模式无关 |
| `cacheable`          | 分析是否未观察输入、时间或等待                 |

工作区内输入用相对路径，外部输入用绝对路径。产物角色包括 `interface`、`cpp-api-header`、`module-implementation`、`test-runner-header`、`test-entry` 和 `semantic-ir`。源映射标记为 `stable-interface` 或 `source-attributed`；合成输出没有所属源文件。C++ 头依赖由原生编译器的依赖文件跟踪。

## 运行时支持

使用与生成文件的编译器版本匹配的 Crafts 和运行时头。生成代码会按所用能力包含相应头文件，私有辅助名字与布局属于实现细节。一般插值需要 C++20 format，支持的内建格式使用专门的写入工具，结构打印使用结构显示工具；这些选择不提高应用选择的最低 C++ 标准。

原生代码直接调用 String 的 from_str/append 时，必须提供有效 UTF-8；push 需要合法 Unicode 标量。原生 from_utf8 会检查输入并在无效时终止，这与源标准库返回类型化失败的接口不同。TCP 的 C++ 实现需要原生执行；编译期和解释执行的输入、时间等能力由各自的执行实现提供。

## SIMD 配置

C++20 运行时为每个翻译单元选择一个后端：可用时使用 AArch64 NEON，x86 在应用启用 AVX2 时使用 AVX2，否则使用 portable。各后端保持相同逻辑通道运算。

x86 使用 `-mavx2`、`/arch:AVX2` 或 Xmake 的 `add_vectorexts("avx2")` 启用 AVX2，定义 `CARVEN_SIMD_FORCE_PORTABLE` 强制 portable。使用 SIMD 或运行时文本的翻译单元必须选择同一后端。

向量和掩码类型位于 `carven::runtime::simd` 下后端专属的 inline namespace。某些带这些类型的编码符号会暴露后端不一致，但仅返回类型或外围结构体未必使链接器发现差异，链接成功不能替代一致配置。
