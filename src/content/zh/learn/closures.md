---
title: "捕获状态与传递行为"
description: 让函数记住状态，有意共享修改，并把策略作为回调传入。
section: learn
lesson: 11
source: docs/language/functions.md
---

## 捕获一个快照

有时算法相同，设置却不同，例如把每个值乘上选定倍数。闭包就是一个能记住所需状态的小函数。开头方括号里的捕获列表说明，它记住了哪些外部值。

```carven
var factor = 2;
let scale = [factor](item: i32) => item * factor;
factor = 10;
println(scale(21), factor);
```

输出 `42 10`。`[factor]` 在创建闭包时复制该值，后来给外层 factor 赋值不会替换捕获。=> 后的表达式就是结果，适合简短计算。需要多条语句时，使用下一个例子里的块体。lambda 捕获列表必须出现，空列表是 `[]`。

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

复制闭包和借用闭包解决不同问题。`let copy = scale;` 创建另一个闭包并复制捕获；`let view: fn(i32) -> i32 = scale;` 只借用 scale，让它能通过统一签名调用。视图不会延长 scale 的生命期：视图存在时，scale 必须仍在作用域内，也不能被转移走。

回调参数很适合使用这样短暂的视图。如果函数要返回闭包，让编译器推断具体闭包类型，不要返回指向局部闭包的视图。若返回的闭包通过 Write 捕获访问其他变量，那些变量也必须比闭包活得久。

回调签名可以包含前面学过的[失败契约](/zh/learn/failures/)，例如 `fn(i32) -> i32 throw InvalidQuantity`；调用它的函数须处理或传播这份契约。保存视图、调整失败契约或返回闭包时，查阅[可调用视图参考](/zh/reference/closures/)中的进一步限制。

## 通过借用回调筛选拥有结果

使用可调用视图，让集合算法与业务策略相互独立：

```carven
fn select(values: [i32], accept: fn(i32) -> bool) -> Vector<i32> {
    var result: Vector<i32> = [];
    for value in values {
        if accept(value) {
            result.push(value);
        }
    }
    return &&result;
}

let minimum = 20;
let enough = [minimum](value: i32) => value >= minimum;
let selected = select([18, 21, 32], enough);
println(selected.length(), selected[0]);
```

输出 `2 21`。调用期间借用数组与回调；selected 拥有数字，在调用后仍可使用。策略闭包拥有捕获的阈值。函数不在结果里保留可调用视图。捕获运行时状态仍需要原生运行，语义解释器不执行捕获闭包。[输入项目](/zh/learn/data-pipeline/)使用具名纯 helper，让同一校验也能在编译期执行。

## 练习

在第二个程序里复制 advance，交替调用两个副本，count 仍共享。如果把捕获改成 `[count]`，体内赋值会被拒绝。用只读返回改写它，比较快照与别名。
