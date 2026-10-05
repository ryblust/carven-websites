---
title: 构建、产物与原生集成
description: 宿主要求、目标 C++20、Xmake 批次、生成接口和运行时支持。
section: reference
lesson: 20
source: docs/toolchain/artifacts.md
---

## 宿主与目标

Carven 编译器使用 C++26，关闭异常与 RTTI。各平台使用 LLVM/Clang 与 libc++，Windows 由 LLVM-MinGW 提供；当前验证的工具链版本为 LLVM 23。将工具链的 `bin` 目录加入 `PATH`，供 Xmake 发现构建工具。仓库命令通过 `./xmakew` 使用 Xmake 3.1.1；Windows PowerShell 中使用 `.\xmakew.ps1`。

生成程序和安装 Crafts 的最低标准为 C++20；使用 Carven 的项目选择标准，运行时通过特性检测使用可用设施。宿主要求不提高目标最低标准。

原生调用方根据提供者需求配置异常支持；包含 C++ throw/try/catch 的 cpp 片段需要其翻译单元开启异常。宿主和目标的 `isize`/`usize` 数据模型必须相同，`f32`/`f64` 要求 IEEE binary32/64，原生选项须保留相等和求值语义。

## 构建责任

成功构建需要完成 Carven 分析、C++ 编译和链接。构建系统提供显式应用输入、原生头文件搜索路径、提供者、库和编译选项；CLI 将应用输入与固定 Crafts 根合并。`carven compile` 写出产物，直接源码运行模式另外完成本地原生编译与执行。

`compile` 也为每个收集到的 Crafts 模块写出生成实现，但不编译也不复制收集到的 `.cpp` 源码。手动 C++ 构建必须把收集到的 Crafts 的生成实现与应用的一起编译，包括内置的 UTF 与 SIMD 模块：

```sh
carven compile -o out main.cv
clang++ -std=c++20 -Iout -I/path/to/carven/crafts \
    out/main.cpp out/crafts/carven/std/utf/*.cpp \
    out/crafts/carven/std/simd/*.cpp -o out/app
./out/app
```

把 `/path/to/carven/crafts` 换成工具链 `bin/` 旁安装的 `crafts/`。导入 `std::utf.text` 不需要额外的 `.cv` 输入，因为 Crafts 会被自动收集。安装的其他 Crafts 也要把各自的生成实现和原生提供者加入 C++ 构建。

C++ 检查被委托的声明、重载、模板、转换、构造和链接。生成诊断带源映射。早期原生聚合组件跨后续失败保存时可能需要复制/移动；不可移动组件可能在原生编译时失败，直接最终位置构造仍可能可用。

## Xmake 消费项目

```text
add_repositories("carven-xmake-repo https://github.com/ryblust/carven-xmake-repo.git")
add_requires("carven")

target("app")
    set_kind("binary")
    add_rules("@carven/carven")
    add_files("src/**.cv")
```

规则取得匹配的 compiler 与 Crafts，以安装 crafts/carven 和项目 crafts 为源根，并加入两处原生 include 根。不存在的项目 crafts 不贡献文件。应用列出自己的源，原生依赖用普通目标配置。测试目标显式加入 tests 下的源并选择测试输出模式。

规则在原生依赖扫描前传入完整 .cv 批次，使用目标私有输出根和链接域，注册生成 .cpp。安装源码保留 crafts/carven 层级。`std::` 选择官方标准库，导入本身不下载包或添加链接库。

先在暂存目录生成，再更新正式输出目录。编译器调用失败时保留原有产物；更新正式输出目录的过程可能部分失败。输入批次、增量更新和失败恢复由规则仓库负责。

## 产物路径

```text
carven/generated/<component-anchor>.hpp
carven/api/<canonical-module-path>.hpp
<canonical-module-path>.cpp
carven/generated/carven-test-runner.hpp
carven/generated/carven-test-main.cpp
```

完整定义依赖连接的声明组成接口组件，anchor 是组件的第一个规范模块名；没有已发布表面的模块不拥有组件头。实现使用规范模块路径。模块实现将自身调用的静态实例生成为提供者命名空间中的 inline 函数。导入的分阶段函数体进入调用方实现：新的静态值调用改变调用方产物，提供者产物仍不依赖调用者。逻辑路径相对于输出根。

export(cpp) 的声明写入可独立包含的 `carven/api` 头文件，位于 `carven::api` 及其下按编码后的模块路径嵌套的命名空间中；对应的包装函数定义位于实现文件。C++ 头导入按模块原次序进入所需产物；外部接口类型需要其上下文模块的完整头文件环境。保留分隔符和重复 include，跨模块使用稳定模块顺序，不复刻任意宏配置顺序。cpp 片段位于实现的 include 后、生成 namespace 前。

默认测试输出包含 runner 和 main，external 输出仅 runner。运行测试按规范模块路径排序，同模块内按源码顺序。安装、旧产物清理和原生调度由构建系统负责。

## 运行时支持

安装布局把 crafts 放在 bin 旁。生成代码按需包含独立运行时头：passing、trap、numeric、array、range、slice、text、utf、string、format、writer、print、display/display、entry、deferred、outcome、callable、stateless、unreachable 和 testing；runtime.hpp 为直接消费者汇总这些头。SIMD 与运行时 UTF 块操作使用 `carven/runtime/simd/simd.hpp`。使用 SIMD 或运行时文本的各翻译单元须选择[一致后端](/zh/reference/simd/#类型与后端)。trap.hpp 为运行时检查提供带源位置的终止报告。

编译器与支持头文件必须匹配。生成的私有名字、辅助函数的选择和数据表示布局属于实现细节。一般插值需要 C++20 format 支持；受支持的内建格式化（包括混合整数、浮点、`bool`、`char` 和文本字段）使用 writer.hpp，结构化打印使用 display/display.hpp；print 可按特性检测使用 C++23 实现而不改变调用方选择的 C++ 标准。

原生直接调用 `String`::from_str/append 要求合法 UTF-8，push 要求合法标量；from_utf8 检查字节并在非法时终止。这些原生 runtime API 与标准库返回 typed failure 的验证 API 分别遵守各自契约。
