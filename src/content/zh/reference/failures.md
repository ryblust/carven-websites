---
title: Typed failure contracts
description: 失败集合、显式上界、推断、传播目标、部分捕获、guard 和重抛。
section: reference
lesson: 12
source: docs/semantics.md
---

## 失败类型与接口

失败是带载荷的可恢复控制效果。载荷类型是可复制的名义结构体或枚举。失败契约是封闭类型集合，成员拼写顺序和声明顺序不影响身份；显式 `throw E + E` 非法。

```carven
struct ReadError {
    code: i32,
}

struct ParseError {
    offset: usize,
}

fn load() -> i32 throw ReadError + ParseError {
    return 42;
}
```

显式 throw 子句是函数体失败集合的上界。调用 load 始终使用声明集合，即使当前体只返回成功。调用者不穿透接口缩小集合。

模块私有、非入口函数和 lambda 省略契约时，对前向调用、直接递归和相互递归求最小不动点。裸函数和 export 函数实际失败非空时必须声明，否则 `CV-EFFECT-THROW-PUBLISHED`。入口若向外传播失败，无论可见性都必须显式声明契约，test 不能向外暴露失败。失败类型必须对接口读者可见。

## `?` 与 `throw`

带 pending failures 的表达式不能直接作为普通完成值消费。后缀 `?` 在该词法位置把操作数失败交给最近外围失败目标，成功时保留成功结果。可作用于调用，也可作用于复合表达式。

```carven
fn sum() -> i32 throw ReadError + ParseError {
    return (load() + load())?;
}
```

第一次 load 失败就跳过第二次与加法。pending 是静态组合事实，不表示运行时等所有计算完成才检查。对空失败集合使用 `?` 是 `CV-EFFECT-PROPAGATE-REDUNDANT`；私有函数推断成无失败后，调用处也必须删除原有 `?`。

`throw value;` 传递载荷，不正常完成。默认复制，显式 Take 按普通 owner 可用性规则执行。已完成修改和外部操作保留，不自动回滚。

## 部分捕获与剩余集合

try 处理保护体里的失败。catch 可以匹配类型、通配、alternative、载荷模式和 guard。未覆盖失败交给外围目标。

外围 protected body、lambda、推断失败的私有非入口函数，以及具有显式 throw 契约的函数允许接收剩余失败。到了 test 边界或没有显式契约的发布/入口函数，必须覆盖所有保护体失败。最终 outward 集合始终检查外围 callable 契约。

```carven
struct A {}
struct B {}

fn source() throw A + B {}

fn wrapper() throw B {
    try {
        source()?;
    } catch {
        A(_) => {},
    }
}
```

该程序处理 A，向外保留 B。若显式写出剩余失败的转发，同一组 A、B 和 source 声明下，wrapper 可以写为：

```carven
fn wrapper() throw B {
    try {
        source()?;
    } catch {
        A(_) => {},
        _ => rethrow,
    }
}
```

两个 wrapper 定义择一使用，得到同一 outward 集合。一个类型只有在所有可能值被 arms 合计覆盖、考虑 guard 拒绝后，才从剩余集合消去。保护体无失败时，try 合法且不因多余而诊断。

## 选择次序与 guard

catch 顺序可观察。一个 arm 内 alternatives 构成一个或模式，第一个匹配 alternative 建立绑定，然后 guard 只运行一次；guard 为 false 进入下一 arm，不在同一 arm 重试另一 alternative。

guard 或 handler 自己产生的失败去外围目标，不被同一个 try 再捕获。不可达或类型不可能匹配的 handler 不贡献可达 outward 失败，但其源码仍接受检查。未穷尽诊断列出未完全覆盖的失败类型，包含部分载荷和可能拒绝的 guard。

## rethrow 与生命周期

rethrow 仅在 catch handler 中合法，转发该 handler 选中的原始失败身份，不接受替换载荷。要翻译失败，用 `throw NewError { ... };`。在闭包内不继承外层 catch 控制上下文。

原始载荷独立于复制的 catch 绑定保持其借用，覆盖选择、guard 和重抛。局部清理不得销毁仍被失败载荷引用的 backing。handler 可以复制借用文本为独立 String 后返回。

C++ 异常不属于失败集合；try 不捕获它们。异常逃出生成 noexcept 边界会按 C++ 规则终止。需要恢复时，原生适配层在该边界前处理异常。
