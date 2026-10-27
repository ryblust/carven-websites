---
title: "项目构建与查询"
description: "用 build.cv 定义原生目标，并通过查询为编辑器提供相同项目模型。"
section: reference
lesson: 37
source: docs/language/build.md
---

先跟随[构建原生项目](/zh/learn/build/)创建普通应用，把 `test` 写在业务源码旁，再用同一份 `build.cv` 构建、运行、测试和查询。`carven test` 为已有目标收集内联测试，无需另建测试目标。本页定义计划、依赖、查询与编译 API 的完整契约。

## 脚本与命令

`carven run main.cv helper.cv -- arguments...` 从给定源码构建并运行一个程序，至少接收一个 `.cv` 文件。第一个文件名决定输出名：`build/main`，Windows 为 `build/main.exe`；文件顺序不决定程序入口，无需构建脚本。

`carven build` 不接收实参，解释当前目录的 `build.cv`。`carven run [target]`、`carven test [target]` 和 `carven query` 也执行该文件。文件名是命令约定，脚本本身是普通 Carven 程序，可以通过 `carven interpret foo.cv` 执行，构建行为来自其库调用。

```carven
import std::build using project;

project({
    targets: [{
        name: "shop",
        kind: .Executable,
        sources: ["src/main.cv", "src/pricing.cv"],
        ...
    }],
    ...
})?;
```

末尾 `...` 默认初始化所有遗漏字段，与字段声明位置无关。`TargetKind` 无默认变体，因此显式提供 `kind`。

## 直接运行已有目标的内联测试

在业务文件中定义函数及相邻的 `test`、`async test`，并把该文件保留在普通应用目标的 `sources` 中。测试块不需要另一个构建目标或手写入口。使用同一份计划：

```sh
carven build
carven run
carven test
carven query
```

`carven build` 构建普通应用，不运行运行时测试；必需的静态测试仍在分析时执行。`carven test` 为已有目标生成测试入口，代替应用入口执行选中的测试块。`async test` 由测试运行器提供根任务并关闭子任务，失败使命令返回非零状态。

运行时测试来自所选目标的显式 Carven 源根，以及已声明源码库依赖提供的源根。仅通过 `import` 到达的模块会参与语义检查，但不会因此自动选中其中的运行时测试。把需要测试的业务模块列在普通目标的 `sources`，即可保留同文件测试与一条 `carven test` 命令的工作流。

省略目标名时，命令依次测试计划中的已有目标；需要限制范围时可用 `carven test shop`。每个目标按自己的源集合及依赖生成测试程序，共享的内联测试参与各个消费者选中的源集合。

## 构建数据与操作

`build(plan: BuildPlan) -> Vector<BuildOutput> throw BuildError` 始终构建计划并返回输出记录，不选择或运行程序。每次调用完成后脚本才执行下一语句，可以检查输出并组合显式构建动作。

`project(plan: BuildPlan) throw BuildError` 使用相同声明，按当前命令选择动作：

| 命令                          | 动作                       |
| ----------------------------- | -------------------------- |
| `carven query`                | 输出一份 JSON 项目描述     |
| `carven build` 或普通解释执行 | 构建已解析目标             |
| `carven run [target]`         | 构建、选择并运行可执行目标 |
| `carven test [target]`        | 构建并运行所选目标的测试块 |

运行命令把 `--` 后的实参原样传给程序。省略目标名时选择唯一可执行产物，静态库不参与选择；存在多个可执行产物时必须命名。构建失败不启动程序，子进程非零退出产生消息带退出码的 `BuildError`。

| 记录            | 字段                                                                                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BuildPlan`     | `targets: Vector<BuildTarget>`、`shared_sources: Vector<String>`、`output_directory: String`                                                                          |
| `BuildTarget`   | `name: String`、`kind: TargetKind`、`sources: Vector<String>`、`headers: Vector<String>`、`native: NativeOptions`、`dependencies: Vector<String>`、`output: String`   |
| `NativeOptions` | `include_dirs`、`defines`、`compile_flags`、`link_flags`、`library_dirs` 均为 `Vector<String>`；`libraries: Vector<LinkLibrary>`、`syslinks: Vector<SystemLibraries>` |
| `BuildOutput`   | `name: String`、`path: String`、`kind: TargetKind`                                                                                                                    |

`TargetKind` 有 `Executable`、`StaticLibrary`、`SourceLibrary`。`dependencies` 指向同一计划的其他目标，要求存在且无环；可执行目标不能作为库依赖。

`SourceLibrary` 只描述源码，不生成归档或对象。消费者按自己的原生配置编译这些源码。源库只能依赖其他源库，可执行与静态库目标可消费两种库。`build` 只返回可执行和静态库产物；全为源库的计划不调用编译器、不创建构建目录，返回空向量。未被消费的源库不成为语义输入根。

源库可声明 `sources`、`headers`、`dependencies` 和按平台分组的 `native.syslinks`，其他 `NativeOptions` 字段和 `output` 会被拒绝。原生编译配置属于最终消费者或外部 Xmake、CMake 目标。

`sources` 接受 Carven 和 C++，`shared_sources` 加入每个目标。项目 `crafts/` 只提供导入候选，已导入闭包参与分析；Craft 的 `build.cv` 通过同一 `project(plan)` 描述目标。C++ 头文件依赖可选中实现目标，但其他 `.cpp` 不会自动加入，须列入 `sources`。相对输入以当前目录为基准；Carven 源码须位于项目根内，原生源码可在外部。

包含路径、宏和编译选项只作用于该产物的对象，编译选项还参与其可执行链接，不传给消费者。需要共享时复用同一个 `NativeOptions` 或用函数构造。静态库依赖的链接选项、库目录与库参与消费者链接。`LinkLibrary::Name("m")` 指定链接器名字，`LinkLibrary::File("thirdparty/libsample.a")` 指定文件；依赖库在解析其符号的外部库之前。

空 `output_directory` 选择 `build`，空目标 `output` 使用平台默认文件名。显式相对输出以计划输出目录为基准，绝对输出直接使用。目标名只含 ASCII 字母、数字、`_`、`-`，忽略 ASCII 大小写后唯一。计划至少一个目标，产物需要源码或库依赖，源库也可只提供头文件。名字、依赖、环、输入存在性和重复输出在生成前检查。

## 项目查询

`carven query` 为编辑器提供目标名、准确的源码成员和监听路径。LSP 使用相同信息选择构建输入，无需另外维护编辑器源码列表。

`project` 的查询动作解析同一份依赖、源码和输出路径，不分析应用源码、不生成 C++、不创建构建目录或调用原生工具，因此应用语法或类型错误不阻止项目发现。脚本本身必须有效，计划非法或输入缺失仍会失败。

JSON 顶层含 `project` 和 `scripts`。`project` 含 `root`、`targets`、`roots`；每个目标含 `name`、`kind`、`default`、`sources`、`headers`、`syslinks`、`dependencies`。种类为 `source-library`、`static-library`、`executable`，路径均为绝对路径。`sources` 是该目标自身输入，包含 `shared_sources`；消费者沿 `dependencies` 选择闭包。计划中的所有目标均为默认目标。

LSP 将选中闭包筛为 Carven 根，再做普通 Craft 发现。标准源码来自匹配工具链，`project.root` 决定模块路径，`roots` 提供监听目录。`scripts` 是构建入口实际加载的源码，包括间接导入。消费者据此使保留分析失效；每次查询仍重新执行脚本，以观察外部文件和环境。

可查询项目使用一次 `project(plan)` 调用，并把 `stdout` 留给 JSON。其前后的文件、进程和显式 `build` 调用仍按顺序执行，包括查询期间；若发现项目时不应准备产物，将准备动作放进独立脚本。

## 自定义准备

计划是普通值，可通过函数、条件、循环和容器组合。构建前的文件操作或工具调用使用标准库：

```carven
import std::build using build;
import std::process using run;

let status = run("python3", ["tools/generate.py"])?;
assert(status == 0);

build({
    targets: [{
        name: "app",
        kind: .Executable,
        sources: ["src/main.cv", "build/generated/schema.cv"],
        native: { include_dirs: ["thirdparty/include"], compile_flags: ["-O2"], ... },
        ...
    }],
    ...
})?;
```

每次调用按程序顺序执行准备动作，由脚本决定生成器调用和退出码处理。构建错误按普通失败处理：

```carven
import std::build using { build, BuildError }

try {
    let outputs = build(plan)?;
    for output in outputs { println(output.path); }
} catch {
    BuildError(error) => println(error.message),
}
```

## 编译 API

`std::compiler.compile(sources: [String], destination: str) -> Compilation throw CompilerError` 通过 `PATH` 中的 `carven compile` 生成产物，并读取目标下的 `carven/manifest.json`。所选编译器提供匹配 Crafts。源码输入执行静态根，已检查产物复用语义；诊断与静态输出继承调用者标准流。空源码列表只写资源清单，不分析或生成 C++，可支持纯原生目标。

`Compilation` 拥有 `cacheable: bool`、`sources: Vector<CompilationSource>`、`crafts: Vector<CompilationCraft>`、`include_dirs: Vector<String>`。每个源码记录规范 `source`、`implementation: Lookup<String>` 与按源路径表达的生成依赖；`Missing` 表示未生成实现，原生源码实现自身。实现路径包含目标目录。

每个 Craft 描述含 `root` 与 `targets`，目标保留查询中的名字、种类、源码、头文件、系统库和依赖。共享源码不合并目标。构建器据此选择执行图；若选中的 Carven 源码没有生成实现，须导入它或显式列为输入。

Craft 用普通 `build.cv` 提供 `SourceLibrary`。头文件匹配、唯一源所有者及目标依赖选中源库闭包。一个头文件可选中多个源库；源码由多个目标共享时，需要无歧义的头文件或目标依赖。目标自己的源边保留目标上下文，不激活同样引用该源码的其他目标。只有选中目标提供系统库；`SystemLibraries` 含 `platform`（`all`、`windows`、`linux`、`macos`）和 `libraries: Vector<String>`。

```carven
import std::build using project;

project({
    targets: [{
        name: "network",
        kind: .SourceLibrary,
        sources: ["network.cpp"],
        headers: ["network.hpp"],
        native: {
            syslinks: [{ platform: "windows", libraries: ["ws2_32"] }],
            ...
        },
        ...
    }],
    ...
})?;
```

编译清单嵌入参与 Craft 的查询结果，无构建脚本的 Craft 仍是普通源库。子目录声明通过函数和导入组合，由根脚本显式组装，不递归执行全部 `build.cv`。`cacheable` 表示分析是否可复用，调用者仍须验证输入和输出。进程失败或清单不可读、无效产生含 `message` 的 `CompilerError`；失败调用不消费旧清单。

脚本是调用 `std::process`、`std::fs`、`std::json` 的普通 Carven，可以解释或原生运行。两者都要求已安装编译器位于 `PATH`，原生脚本不链接编译器内部实现。

## 原生工具链与执行

`CXX` 选择单个编译器可执行文件，未设置时在 `PATH` 找 `clang++`；名称与路径允许空格，选项写入 `NativeOptions`。交叉编译使用目标编译器或 `--target=...` 等选项，选项也参与可执行链接。系统库按配置驱动器的 `-dumpmachine` 目标选择，不按构建宿主选择。需要不同后缀时显式提供 `output`。

环境须提供编译器、SDK、链接器和归档工具，原生参数使用 GCC/Clang 约定，以 C++20 为基线，不导入 `CXXFLAGS` 或 `LDFLAGS`。

构建器合并产物 Carven 根及源库输入。编译器、已加载源码、Craft 候选名字未变且分析可复用时保留分析，生成复用还检查输出和测试模式。Craft 脚本分析可在应用与测试之间共享，但脚本每次执行以观察配置。显式 `std::compiler.compile` 总是调用编译器。

`carven test [target]` 构建所选目标及依赖的测试块，省略目标选择全部。源库使用默认原生设置，静态依赖保留选项和归档。测试产物位于输出下 `tests/<target>/`，无运行时测试的目标跳过原生编译。手写 C++ 入口与被测源码放在不同目标；Xmake/CMake 自行声明测试目标。

原生编译沿生成实现、Craft 源所有权和 C++ 头文件依赖进行。纯类型依赖只提供头文件，静态库通过归档交付自己的实现对象。对象仅在源码和原生配置相同且命令、工具、环境、源与头内容、输出、头搜索目录均匹配时共享。观察宿主效果的分析阻止本轮对象复用；链接复用要求已知文件输入，具名库和无限制选项需要重新链接。

生成 C++、对象和依赖记录保存在输出目录的 `.carven/`。删除整个输出目录可重新构建。相同输出目录的构建串行运行，原生编译并发不超过宿主提示。编译失败停止派发并等待已启动子进程返回，先前成功产物保持可用。无效计划、编译、文件或子进程失败均通过含 `message` 的 `BuildError` 报告。
