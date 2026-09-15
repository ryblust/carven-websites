---
title: 条件、循环与表达式
description: 用 bool 条件、半开范围和循环更新构造清晰的控制流。
section: learn
lesson: 3
source: docs/semantics.md
---

## 条件产生一个值

```carven
fn main() {
    let quantity = 3;
    let label = if quantity > 0 { "in stock" } else { "empty" };
    println(label);
}
```

输出 `in stock`。值形式 if 必须有 else，分支结果类型兼容。分支最后不带分号的表达式产生分支值；加分号后成为普通语句。

## 从范围计算总和

```carven
fn main() {
    var total = 0;

    for value in 1..5 {
        total += value;
    }

    println(total);
}
```

输出 `10`。`1..5` 包含 1、2、3、4，不含 5；起点和终点只求值一次。起点不小于终点时零次迭代。整数范围绑定提供 Read，不能给它加 Write 标记。

## while 与 C 风格 for

```carven
fn main() {
    var index = 0;

    while index < 3 {
        println(index);
        ++index;
    }

    for var i = 0; i < 3; ++i {
        if i == 1 {
            continue;
        }
        println(i);
    }
}
```

依次输出 0、1、2、0、2，各一行。C 风格 for 的 continue 会先执行步进再判断条件；break 直接退出循环。while 每次执行体前检查条件。

## 短路与失败

`&&` 左侧为 false 时不执行右侧；`||` 左侧为 true 时不执行右侧。只有所选分支运行，但所有源分支都检查类型与失败消费。把错误代码写在 `if false` 里不使它合法。

值形式 if/match/try 的分支不能 return 到外围函数，也不能 break/continue 到外围循环。需要外围转移时使用语句形式。

## 练习

把求和范围改为 1..1，结果应为 0。再将求和范围改成 1..6 并跳过 3，结果应为 12。用 while 写出相同结果。
