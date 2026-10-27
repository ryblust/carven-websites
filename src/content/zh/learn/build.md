---
title: 用 Carven 构建与测试
description: 将测试写在业务函数旁，用 build.cv 描述应用，再用 carven test 运行项目的内联测试。
section: learn
lesson: 19
source: docs/language/build.md
---

## 让函数与测试放在一起

价格计算和验证它的检查可以写在一起。把 `test` 块放在函数旁，将这份业务源码加入应用目标，再用 `carven test` 运行项目测试。构建脚本本身也使用普通 Carven 代码。

本课只有三个文件：带内联测试的价格模块、应用入口，以及 `build.cv`。同一份应用计划用于 `carven build`、`carven run`、`carven test` 和 `carven query`。

## 准备本地工具链

安装 [Carven 0.1.0](/zh/learn/first-program/#安装-carven-010)，保留配套的 Crafts 资源，并将 `carven` 加入 `PATH`。原生构建需要支持 C++20 的编译器、SDK 和链接器。构建器传入 GCC/Clang 风格的参数，默认使用 `clang++`；`CXX` 可以选择一个编译器可执行文件。

本课在本地终端执行。浏览器 Playground 不启动原生编译器，也不执行项目构建。这个例子不需要安装 Xmake、CMake 或 Node.js。

新建名为 `shop` 的目录，按下列结构保存文件。后面的命令都在 `shop` 中运行：

```text
shop/
├── build.cv
└── src/
    ├── pricing.cv
    └── main.cv
```

## 编写业务代码与内联测试

保存 `src/pricing.cv`：

```carven
fn discounted(price: i32, percent: i32) -> i32 =>
    price * (100 - percent) / 100;

test "discounted price" {
    check(discounted(1200, 0) == 1200);
    check(discounted(1200, 25) == 900);
}
```

`discounted` 用整数货币最小单位计算折后价格。紧邻函数的测试验证原价和 25% 折扣，两条 `check` 属于同一个具名测试。示例使用 0 到 100 之间的折扣百分比。

函数的裸声明对本项目其他模块可见；面向其他 Craft 提供 API 时才需要 `export`。

保存 `src/main.cv`：

```carven
import .pricing using discounted;

println("Order total:", discounted(1200, 25));
```

相对导入选择 `src.pricing`。顶层打印语句组成应用入口；测试运行器执行内联测试时，不运行这条应用语句。

## 只描述一份应用目标

保存 `build.cv`：

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

CLI 把这个文件当作普通 Carven 程序解释执行。`std::build` 是[工具链中的源码库](https://github.com/ryblust/carven/blob/v0.1.0/crafts/carven/std/build.cv)，其中的 `project` 函数选择构建动作，并在需要时调用原生工具。函数、记录、条件和失败处理都保持平常的语言含义。

计划只声明一个普通的 `shop` 可执行目标，两个文件都属于这个应用：`src/main.cv` 是入口，`src/pricing.cv` 包含业务函数和测试。

在 `sources` 中列出两个文件：0.1.0 根据显式源码根选择运行时测试。导入会引入函数，并加载依赖进行分析，但不会选择该依赖的运行时测试。把业务模块列入目标源码，`carven test` 才会运行其中的内联测试。

`project` 提供预期的 `BuildPlan` 类型，内层字段再提供 `BuildTarget` 类型。末尾的 `...` 默认初始化未指定字段，包括原生选项和输出路径。`?` 将 `BuildError` 从脚本向外传播。

## 构建并运行应用

构建原生程序：

```sh
carven build
```

默认输出为 `build/shop`，Windows 上为 `build/shop.exe`。生成的 C++、对象文件和依赖记录保存在 `build/.carven/` 下。

构建并运行：

```sh
carven run
```

构建状态行之后，程序输出：

```text
Order total: 900
```

计划中只有一个可执行目标，因此不需要指定目标参数。应用参数写在 `--` 之后。

## 运行项目的内联测试

仍在同一个目录运行：

```sh
carven test
```

构建器使用普通应用目标的源码根，生成测试入口，执行 `discounted` 旁边的测试，并跳过应用中的打印。测试产物放在 `build/tests/shop/` 下。

运行器在 `stderr` 报告：

```text
carven: tests: 1 passed; 0 failed
```

把 `pricing.cv` 中第二条检查的预期值临时从 900 改为 901，再运行 `carven test`。报告会指出失败条件及其操作数，命令以非零状态退出。恢复 900 后重跑，即可重新通过。

应用增大后，继续把测试放在被验证的函数旁，并将这些业务文件加入目标的源码根，同一条命令就能运行它们的测试。计划包含多个目标时，`carven test` 运行各目标的测试套件；`carven test <target>` 选择其中一个。

## 查询编辑器使用的同一份项目

不编译应用，查看计划：

```sh
carven query
```

JSON 的 `project.targets` 中只有一个 `shop`：

| 字段           | 值                                           |
| -------------- | -------------------------------------------- |
| `name`         | `shop`                                       |
| `kind`         | `executable`                                 |
| `default`      | `true`                                       |
| `sources`      | `src/main.cv` 与 `src/pricing.cv` 的绝对路径 |
| `dependencies` | 空列表                                       |

`project.root` 标识项目目录，`project.roots` 提供监听路径，`scripts` 列出 `build.cv` 及其加载的源码依赖。语言服务器通过这个模型选择应用输入，构建、内联测试和编辑器分析共用应用计划。

本例查询不会创建构建目录或 C++ 输出。应用类型错误不阻止目标发现，但构建脚本错误或声明的文件缺失会让查询失败。

## 用普通函数组合构建选项

构建配置也是普通数据。要用函数选择原生选项，将 `build.cv` 替换为：

```carven
import std::build using { project, NativeOptions }

fn native_options(optimized: bool) -> NativeOptions => {
    compile_flags: if optimized { ["-O2"] } else { ["-O0", "-g"] },
    ...
};

project({
    targets: [{
        name: "shop",
        kind: .Executable,
        sources: ["src/main.cv", "src/pricing.cv"],
        native: native_options(true),
        ...
    }],
    ...
})?;
```

`native_options` 返回一个 `NativeOptions` 记录，条件选择优化或调试参数，`...` 补齐其他默认值。应用源码与内联测试仍在同一目标中，继续运行相同的四条命令即可。

更大的脚本可以用普通函数、条件、循环、文件系统操作或 TOML 解析组装计划。`project(plan)` 分派 `build`、`run`、`test` 和 `query`，其他语句在查询时仍正常执行，因此放在 `project` 之前的生成器也会在项目发现时运行。需要让查询只查看计划时，把准备操作放进独立脚本，并将查询的 `stdout` 留给 JSON 模型。

源码库、静态库边界、更多原生选项与命令式 `build(plan)` 调用见[构建参考](/zh/reference/build/)。已有 Xmake 和 CMake 项目可使用[安装版集成](/zh/reference/toolchain/)。

## 练习

把应用折扣改为 10，预期输出 `Order total: 1080`。在 `pricing.cv` 的相邻测试中加入这个案例，再运行 `carven test`。新增一个业务模块，在其中写内联测试，并把它加入同一目标的 `sources`。

测试需要直接等待工作时，使用 `async test`。可以先在[在线异步测试](/zh/playground/#example=async-tests)中点击「测试」，再将这种写法放在本地的异步业务函数旁。
