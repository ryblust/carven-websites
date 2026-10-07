---
title: "捕获状态与传递行为"
description: 从值捕获到 Write 捕获，区分拥有闭包与非拥有 view。
section: learn
lesson: 11
source: docs/language/functions.md
---

## 捕获一个快照

```carven
var factor = 2;
let scale = [factor](item: i32) => item * factor;
factor = 10;
println(scale(21), factor);
```

输出 `42 10`。`[factor]` 在创建闭包时复制该值，后来给外层 factor 赋值不会替换捕获。`=>` 后的表达式就是 lambda 的结果，适合只有一个计算的简短 lambda；需要多条语句时改用块体，如下一个例子。lambda 捕获列表必须出现，空列表是 `[]`。

## 修改外层存储

```carven
var count = 0;
let advance = [&count]() {
    count += 1;
    return count;
};

println(advance(), advance(), count);
```

输出 `1 2 2`。Write 捕获要求源可写，闭包持有指向同一存储的别名。闭包 owner 是 `let`，不影响已捕获的 Write 权限。捕获本身不能 Take，也没有 `[&&count]`。

## 把行为传给函数

```carven
fn apply(callback: fn(i32) -> i32, value: i32) -> i32 => callback(value);

let factor = 2;
let scale = [factor](item: i32) => item * factor;
println(apply(scale, 21));
```

输出 `42`。参数类型 `fn(i32) -> i32` 表示接收 `i32` 并返回 `i32` 的可调用对象。这里把 scale 传入时创建非拥有的 callable view：apply 调用原来的闭包，闭包本身在整个调用期间保持存活。

## 拥有闭包与 view

`let copy = scale;` 保留具体闭包类型并复制捕获。`let view: fn(i32) -> i32 = scale;` 创建非拥有 view，借用捕获闭包对象。view 不复制捕获，也不延长闭包对象的生命周期。view 借用存在时不能 Take 源闭包。

作为直接实参，可以传捕获 lambda 临时值；其存储覆盖整个调用。view 不能从函数返回、放进结构体或枚举、被另一个 lambda 捕获，数组中的 view 也受这些限制。需要返回闭包时，可以让编译器推断具体闭包类型，但其 Write 捕获指向的对象必须保持存活。

可调用参数也能声明前面学过的[失败契约](/zh/learn/failures/)，例如 `fn(i32) -> i32 throw InvalidQuantity`。失败更少的回调可以满足更宽的契约。如果不可变局部绑定直接初始化为已知函数，例如 `let widened: fn(i32) -> i32 throw InvalidQuantity = double;`（double 不抛出），通过 widened 调用仍沿用 double 自身的契约，不需要 `?`；同类型的参数则按 view 类型的契约调用。复制 view 与拓宽已有 view 的借用行为不同；需要保存或重新绑定这类 view 时，查阅[可调用视图参考](/zh/reference/closures/)。

## 练习

在第二个程序里复制 advance，交替调用两个副本，count 仍共享。如果把捕获改成 `[count]`，体内赋值会被拒绝。用只读返回改写它，比较快照与别名。
