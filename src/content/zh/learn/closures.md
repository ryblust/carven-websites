---
title: "捕获状态与传递行为"
description: 从值捕获到 Write 捕获，区分拥有闭包与非拥有 view。
section: learn
lesson: 10
source: docs/semantics.md
---

## 捕获一个快照

```carven
fn main() {
    var offset = 2;
    let add = [offset](value: i32) => value + offset;
    offset = 10;
    println(add(40), offset);
}
```

输出 `42 10`。`[offset]` 在创建闭包时复制该值，后来给外层 offset 赋值不会替换捕获。lambda 捕获列表必须出现，空列表是 `[]`。

## 修改外层存储

```carven
fn main() {
    var count = 0;
    let advance = [&count]() {
        count += 1;
        return count;
    };

    println(advance(), advance(), count);
}
```

输出 `1 2 2`。Write 捕获要求源可写，闭包持有指向同一存储的别名。闭包 owner 是 let，不影响已捕获的 Write 权限。捕获本身不能 Take，也没有 `[&&count]`。

## 把行为传给函数

```carven
fn apply(callback: fn(i32) -> i32, value: i32) -> i32 {
    return callback(value);
}

fn main() {
    let offset = 2;
    let add = [offset](value: i32) => value + offset;
    println(apply(add, 40));
}
```

输出 `42`。参数类型 `fn(i32) -> i32` 表示接收 i32 并返回 i32 的可调用对象。这里把 add 传入时创建非拥有的 callable view：apply 调用原来的闭包，闭包本身在整个调用期间保持存活。

## 拥有闭包与 view

`let copy = add;` 保留具体闭包类型并复制捕获。`let view: fn(i32) -> i32 = add;` 创建非拥有 view，借用捕获闭包对象。view 不复制捕获，也不延长闭包对象的生命周期。view 借用存在时不能 Take 源闭包。

作为直接实参，可以传捕获 lambda 临时值；其存储覆盖整个调用。view 不能从函数返回、放进结构体或枚举、被另一个 lambda 捕获，数组中的 view 也受这些限制。需要返回闭包时，可以让编译器推断具体闭包类型，但其 Write 捕获指向的对象必须保持存活。

可调用参数也能声明前面学过的[失败契约](/zh/learn/failures/)，例如 `fn(i32) -> i32 throw InvalidQuantity`。失败更少的回调可以满足更宽的契约。复制 view 与拓宽已有 view 的借用行为不同；需要保存或重新绑定这类 view 时，查阅[可调用视图 Reference](/zh/reference/closures/)。

## 练习

在第二个程序里复制 advance，交替调用两个副本，count 仍共享。如果把捕获改成 `[count]`，体内赋值会被拒绝。用只读返回改写它，比较快照与别名。
