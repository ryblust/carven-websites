---
title: 闭包与回调
description: 从值捕获到 Write 捕获，区分拥有闭包与非拥有 view。
section: learn
lesson: 8
source: docs/semantics.md
---

## 捕获一个快照

```carven
fn apply(callback: fn(i32) -> i32, value: i32) -> i32 {
    return callback(value);
}

fn main() {
    var offset = 2;
    let add = [offset](value: i32) => value + offset;
    offset = 10;
    println(add(40), apply(add, 40), offset);
}
```

输出 `42 42 10`。`[offset]` 在创建闭包时复制该值，后来给外层 offset 赋值不会替换捕获。lambda 捕获列表必须出现，空列表是 `[]`。

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

## 拥有闭包与 view

`let copy = add;` 保留具体闭包类型并复制捕获。`let view: fn(i32) -> i32 = add;` 创建非拥有 view，借用捕获闭包对象。view 不复制捕获，不延长 owner 寿命。view 借用存在时不能 Take 源闭包。

作为直接实参，可以传捕获 lambda 临时值；其存储覆盖整个调用。view 不能从函数返回、放进结构体或枚举、被另一个 lambda 捕获，数组中的 view 也受这些限制。需要返回闭包时可以推断具体闭包结果，但它的 Write referent 必须存活。

同类型 view 复制保存目标描述；把已有 view 的失败集合拓宽，则借用源 view 槽位，所以会观察源 view 的重新绑定。失败章节会介绍集合。

## 练习

在第二个程序里复制 advance，交替调用两个副本，count 仍共享。如果把捕获改成 `[count]`，体内赋值会被拒绝。用只读返回改写它，比较快照与别名。
