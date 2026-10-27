---
title: "工具链与原生产物"
description: "原生构建要求、生成接口、清单、源库声明和 Xmake/CMake 集成。"
section: reference
lesson: 24
source: docs/toolchain/artifacts.md
---

## 宿主与目标

编译器实现使用 C++26，关闭异常和 RTTI，使用 LLVM/Clang 与 libc++；Windows 通过 LLVM-MinGW 提供，验证版本为 LLVM 23。生成程序及已安装 Crafts 的最低基线为 C++20，消费者选择自己的标准版本。编译器宿主能力不提高生成程序的基线。

原生消费者按提供者要求选择异常支持。生成翻译单元里的 `#[cpp]` 包含 C++ `throw`、`try/catch` 时，需要为该单元开启异常。完整构建包含 Carven 分析、原生编译和链接；原生编译器继续检查声明、重载、模板和转换，因此语义检查成功不保证原生构建成功。受支持且满足提供者要求的操作若产生无效 C++，属于编译器缺陷。

### 构造限制

聚合中先求值一个原生成员，后续成员可能发生 Carven 失败时，生成器可能先保存前者，再复制或移动到最终聚合。原生类型必须满足实际需要的复制或移动；不需中间传递的 prvalue 仍可原位构造不可移动结果。

## 数值模型

`isize`、`usize` 分析时使用宿主指针宽度，运行时目标须匹配。`f32`、`f64` 要求 IEEE 754 binary32、binary64，原生选项须保留 IEEE 相等语义和 Carven 求值顺序。

<span id="构建责任"></span>

## 构建职责

`carven compile` 只写 C++ 和描述输入、实现、链接要求的清单，不进行原生编译。消费构建系统管理原生配置、头文件依赖、编译、链接、对象和调度。导入 C++ 头文件不自动指定实现或链接库，所属 Craft 在 `build.cv` 描述要求。

`carven build` 执行项目 `build.cv`，其 `std::build` 计划构建可执行或静态库，`run` 启动可执行产物，`test` 为计划中的内联测试构建测试程序，详见[构建 API](/zh/reference/build/)。

外部工程包含已安装 Xmake 规则，或设置 `Carven_DIR` 并加载 CMake 包。两者使用该安装的编译器和 Crafts，把清单映射为原生输入；项目保留原有目标声明，不要求额外项目 `build.cv`。

Xmake 通过 `add_files` 选择入口源，测试目标显式使用 `add_rules("carven", {tests = true})` 和 `add_tests`。CMake 用 `carven_target_sources` 生成源码，再用普通 CMake 命令声明测试。测试模式替换 Carven 程序入口；测试目标使用生成入口时，排除手写 C++ 入口。

Xmake 对相同源码批次共享已检查语义，对相同生成请求共享文本。CMake 按目标保留产物；原生对象仍按消费者的配置与依赖规则复用。独立链接的定义须有唯一所有者，交换生成类型的组件须使用兼容 ABI。

分析记录加载源码与候选模块名，观察宿主效果时重新执行。生成保持未改文本；Craft 查询共享已检查脚本语义，但每次重新执行以观察外部配置，查询结果独立更新原生要求。主仓库开发使用当前构建的编译器和 checkout Crafts，先 `./xmakew build` 再 `./xmakew test`。

<span id="xmake-项目配置"></span>

## 产物路径

`check -o <dir>` 写保留语义及清单，`compile` 写 C++ 及清单。将分析目录传给 `compile` 可复用发布程序生成普通或测试 C++，不重复分析和静态执行。已检查 Craft 目录也可给新批次提供定义，新的泛型或静态实例在消费方分析中构造；依赖新鲜度由构建系统保证。

```text
carven/manifest.json
carven/generated/<linkage-domain>/<component-anchor>.hpp
carven/api/<canonical-module-path>.hpp
carven/providers/<canonical-module-path>.hpp
<canonical-module-path>.cpp
carven/generated/carven-test-runner.hpp
carven/generated/carven-test-main.cpp
```

接口组件组合需要完整定义的声明，以首个规范模块路径为锚。没有发布语义表面的模块不单独形成组件。实现按模块路径命名，模块调用的静态实例在提供者命名空间以 `inline` 发出；新静态实参改变调用者实现，不改变提供者产物。

`carven/api` 头包含显式 `export(cpp)` 接口，位于 `carven::api` 下按模块路径编码的命名空间，实现中提供包装定义。头自包含并发布类型化源契约，签名类型无须普通 `export` 就能被 C++ 使用。

`carven/providers` 头为具体 `import(cpp)` 发布签名别名、宿主契约和完整类型依赖。未显式绑定原生目标时，生成接口提供相应 `invoke` 声明，提供者包含该头实现它；显式目标仍使用手写 C++ 声明。

C++ 头导入按所属模块顺序进入实现。接口需要原生类型或查询时带入上下文模块的完整头导入，包括无 `using` 的导入；模块查找还保留整个 using 环境。各模块环境只呈现一次，保留顺序、分隔和显式重复，跨环境按规范模块路径排序。头须能按该顺序工作；跨模块宏配置顺序不保留。原始源片段只进入实现，位于 include 后、生成命名空间前。

生成实现先包含对应接口，测试入口先包含 runner，再跟原生头环境、运行时头、其他接口及所需标准头。生成依赖分组排序，显式原生重复保持独立。头文件以 pragma-once 开始。

项目链接身份结合生成目的地、模块路径和测试模式。每个应用目标拥有自己的生成目录；源码成员变化不改变目录。Craft 按名字拥有稳定链接身份。公共 `carven::api` 接口在整个程序共享名字空间，独立链接模块须有不同规范路径；多个消费者需要相同定义时，通过一个原生库目标共享。

### 清单

逻辑路径相对于输出目录，构建系统管理旧文件清理、安装和原生调度。

| 字段                 | 含义                                     |
| -------------------- | ---------------------------------------- |
| `workspace.root`     | 调用工作目录                             |
| `inputs`             | 源路径、规范模块名、所有权及标准库身份   |
| `artifacts`          | 相对输出路径、角色、源映射和实现所属源码 |
| `runtime_test_count` | 所属模块的运行时测试数，与生成模式无关   |
| `cacheable`          | 分析是否可在不重新观察宿主效果时复用     |
| `include_dirs`       | 工具链与参与 Craft 的绝对头搜索根        |
| `library_roots`      | 提供候选 Craft 源码的目录                |
| `craft_roots`        | 参与 Craft 的目录，可带普通 `build.cv`   |
| `crafts`             | 查询的 Craft 描述及实际加载脚本输入      |

工作区内源用相对路径，外部输入用绝对路径。产物角色包括 `interface`、`cpp-api-header`、`module-implementation`、`test-runner-header`、`test-entry`、`semantic-ir`。源映射为 `stable-interface` 或 `source-attributed`，合成产物没有源所有者。C++ 依赖文件记录头文件依赖。

Craft 用普通脚本声明源库：

```carven
import std::build using project;

project({
    targets: [{
        name: "network",
        kind: .SourceLibrary,
        sources: ["net.cv", "net/native.cpp"],
        headers: ["net/native.hpp"],
        native: {
            syslinks: [{ platform: "windows", libraries: ["ws2_32"] }],
            ...
        },
        ...
    }],
    ...
})?;
```

`carven query` 在 Craft 目录执行声明，`compile` 将查询嵌入清单，无需手写 JSON。`scripts` 记录实际加载的构建源码及间接导入，不包含仅在计划中列出、未导入的应用源。

消费方可用 `compile --no-query` 分开生成与查询，清单保留 `craft_roots`，`crafts` 为空。对现有 `build.cv` 分别 `check build.cv -o <checked>`、`query <checked>`，按分析清单验证新鲜度后刷新查询结果。查询始终执行，保留语义只跳过前序分析和静态执行。

`SourceLibrary` 只声明源码和要求，由消费者配置编译，不生成归档。它提供 `sources`、`headers`、`dependencies` 与按 `all/windows/linux/macos` 分组的 `syslinks`，路径为绝对路径。实际静态库是构建产物，不能被适配器当成源码组展开。

选中源码激活其源库及依赖。Carven 文件须通过导入或显式根进入语义分析；声明不会给未分析文件自动生成实现。编译选项、宏、优化和依赖获取属于消费方。分析复用检查已加载内容、编译器、选项和候选文件名，未使用候选的内容不使其失效；查询独立刷新，不被生成缓存掩盖。共享源码或文本不等于共享原生对象。

## 运行时支持

生成文件和原生消费者包含自包含的匹配支持头。主要领域包括 `call`、`collection`、`diagnostics`、`display`、`execution`、`format`、`io`、`numeric`、`simd`、`testing`、`text`、`value`，必须与生成编译器配套。

执行核心管理冷操作、激活、事件源和驱动器；子任务作用域管理就绪、结果观察和关闭。组合基于子作用域，时间基于核心，超时组合二者。各头直接包含自己的依赖，生成代码按符号所属领域选择头。

`io/stream.hpp` 管理平台字节流机制，`io/queue.hpp` 调度输入请求，`io/stdin.hpp` 提供原生读取入口，`io/print.hpp` 用 C++20 `fwrite` 写 `stdout` 和 `stderr`。结构显示来自 `display/display.hpp`，格式化与结构头按生成实参转换选择。

`execution/entry.hpp` 提供入口参数与失败报告，Windows 将 CRT 宽实参转 UTF-8，POSIX 要求输入已有合法 UTF-8。`testing/testing.hpp` 提供测试上下文、失败和报告，`testing/async.hpp` 驱动异步测试根直到子任务关闭，并向活动测试报告根取消。

`text/text.hpp` 提供拥有型 `String`、借用视图、UTF-8 和原生转换。C++ 直接调用 `String::from_str`、`append` 须提供有效 UTF-8，`push` 须为 Unicode 标量；`from_utf8` 校验无效数据并终止。源标准库的失败契约与该原生接口不同。保留的 `String`、`Vector` 常量使用不可变存储及原生 constexpr 描述符，Read 不分配，运行时复制产生独立所有者。

`format/format.hpp` 依赖 C++20 `<format>`，`format/writer.hpp` 提供预备内建格式化；原生编译器检查委托格式串及 formatter。私有目标名、布局和辅助选择属于实现细节。

## SIMD 配置

每个翻译单元选择一个 C++20 SIMD 后端：可用时用 AArch64 NEON，消费者启用时用 x86 AVX2，否则为便携实现。逻辑通道操作一致。x86 可用 `-mavx2`、`/arch:AVX2` 或 Xmake `add_vectorexts("avx2")`；`CARVEN_SIMD_FORCE_PORTABLE` 强制便携后端。

共享 SIMD、运行时文本类型或内联定义的单元须选择同一后端，独立程序可不同。类型位于 `carven::runtime::simd` 的后端专属内联命名空间；部分类型编码符号能暴露不一致，但只含返回类型或外围结构体的差异未必被链接器发现，链接成功不能替代一致配置。
