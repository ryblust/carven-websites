---
title: "测试成功与失败路径"
description: 让正常路径、边界与失败恢复得到可重复验证。
section: learn
lesson: 11
source: docs/semantics.md
---

## 写一条运行时测试

在 Carven 仓库根目录保存 totals.cv：

```carven
fn total(price: i32, count: i32) -> i32 => price * count;

test "line total" {
    check(total(12, 3) == 36);
    check(total(12, 0) == 0, "zero quantity");
}
```

测试与函数写在同一模块，也可以放在专用测试文件中。普通 test 在 compile 时被分析，但默认不生成 runner；请求测试产物：

```sh
./xmakew run carven compile --tests=default -o generated totals.cv
```

此命令只生成 C++。对这个单文件、没有 main 的例子，在同一仓库根目录继续执行：

```sh
clang++ -std=c++20 -Igenerated -Icrafts \
  generated/totals.cpp \
  generated/carven/generated/carven-test-main.cpp \
  -o generated/totals-tests
./generated/totals-tests
```

使用支持项目目标运行时的 clang++；需要时换成其完整路径。测试通过时程序成功退出。`-Igenerated` 提供生成接口，`-Icrafts` 提供与编译器匹配的运行时头文件。使用已安装编译器的项目应将 Crafts 路径替换为安装位置。

一个测试可执行程序只链接一个入口。`--tests=default` 不会移除源码 main，因此这个示例不声明 main。其他项目需要按模块拆分程序入口和被测函数，再选择测试所需实现；原生依赖还需加入提供者和链接库。Carven 自身仓库的已注册测试目标使用 `./xmakew test -g language` 等命令运行。

## check、require 与 fail

check 失败报告后继续，适合一组独立断言。require 失败停止当前整个测试，适合后续代码依赖的条件。fail 无条件停止当前测试。消息是 str 或 String，条件必须 bool。

即使条件成立，消息表达式也会求值，因此不应在其中放入仅应在失败时执行的操作。测试停止会穿过同步调用的 Carven 辅助函数和可调用视图，并清理局部值；try 无法捕获测试停止。

## 测试可恢复失败

将下面内容追加到前面的 totals.cv，再执行相同的生成、原生编译与运行命令：

```carven
struct Invalid {}

fn positive(value: i32) -> i32 throw Invalid {
    if value <= 0 {
        throw Invalid {};
    }

    return value;
}

test "reject zero" {
    let rejected = try {
        positive(0)?;
        false
    } catch {
        Invalid(_) => true,
    };

    check(rejected);
}
```

test 不允许剩余失败逃出。上例同时确认调用发生了失败和恢复分支得到选择。测试成功输入时也必须处理契约中声明的失败，而不是根据当前输入假设不会失败。

## 读诊断

先看原始 .cv 位置，再看诊断代码和解释。类型、所有权、失败集合、C++ 编译与链接是不同边界。Carven 分析通过后仍可能有原生构造或提供者错误。

未使用名字可以改成 `_` 表达有意丢弃。警告不使有效程序失败。遇到原生错误，应检查头文件、提供者签名与构造要求。

## 练习

为 positive 增加成功值 3 的测试，再把输入改成 -1。比较 check(false) 与 require(false) 后面一条 println 是否执行。这里用运行时 test；纯编译期算法可以另加 const test。
