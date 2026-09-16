---
title: 构建、产物与原生集成
description: 宿主要求、目标 C++20、Xmake 批次、生成接口和运行时支持。
section: reference
lesson: 19
source: docs/toolchain.md
---

## 宿主与目标

Carven 编译器使用 C++26，关闭异常与 RTTI。当前验证宿主为 LLVM/Clang 与 libc++ 23.1.0。生成程序和安装 Crafts 的最低标准为 C++20；使用 Carven 的项目选择标准，运行时通过特性检测使用可用设施。宿主要求不提高目标最低标准。

原生调用方根据提供者需求配置异常支持；包含 C++ throw/try/catch 的 cpp 片段需要其翻译单元开启异常。宿主和目标的 isize/usize 数据模型必须相同，f32/f64 要求 IEEE binary32/64，原生选项须保留相等和求值语义。

## 构建责任

成功构建需要完成 Carven 分析、C++ 编译和链接。构建系统提供完整源批次、原生头文件搜索路径、提供者、库和编译选项。`carven compile` 写出产物，直接源码运行模式另外完成本地原生编译与执行。

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

完整定义依赖连接的声明形成接口组件，anchor 是其中首个规范模块名；没有发布表面的模块不拥有组件头。实现使用规范模块路径。逻辑产物路径相对于输出根。

export(cpp) 的声明写入可独立包含的 `carven/api` 头文件，位于 `carven::api` 及其下按编码后的模块路径嵌套的命名空间中；对应的包装函数定义位于实现文件。C++ 头导入按模块原次序进入所需产物；外部接口类型需要其上下文模块的完整头文件环境。保留分隔符和重复 include，跨模块使用稳定模块顺序，不复刻任意宏配置顺序。cpp 片段位于实现的 include 后、生成 namespace 前。

默认测试输出包含 runner 和 main，external 输出仅 runner。运行测试按规范模块路径排序，同模块内按源码顺序。安装、旧产物清理和原生调度由构建系统负责。

## 运行时支持

安装布局是 bin 旁的 crafts。生成代码按需 include passing、numeric、array、slice、text、utf、string、format、writer、print、entry、deferred、outcome、callable、unreachable、testing 等 runtime 叶头；runtime.hpp 汇总它们。

编译器与支持头文件必须匹配。生成的私有名字、辅助函数的选择和数据表示布局属于实现细节。一般插值需要 C++20 format 支持；print 可按特性检测使用 C++23 实现而不改变调用方选择的 C++ 标准。

原生直接调用 String::from_str/append 要求合法 UTF-8，push 要求合法标量；from_utf8 检查字节并在非法时终止。这些原生 runtime API 与标准库返回 typed failure 的验证 API 分别遵守各自契约。
