---
title: "捕获状态与传递行为"
description: 让函数记住状态，有意共享修改，并把策略作为回调传入。
section: learn
lesson: 11
source: docs/language/functions.md
---

## 捕获一个快照

有时算法相同，设置却不同，例如把每个值乘上选定倍数。闭包就是一个能记住所需状态的小函数。开头方括号里的捕获列表说明，它记住了哪些外部值。

用 `carven main.cv` 运行本课示例。捕获闭包需要原生执行，解释器不执行这些闭包。

```carven
var factor = 2;
let scale = [factor](item: i32) => item * factor;
factor = 10;
println(scale(21), factor);
```

输出 `42 10`。`[factor]` 在创建闭包时复制该值，后来给外层 factor 赋值不会改变已捕获的值。=> 后的表达式就是结果，适合简短计算。需要多条语句时，使用下一个例子里的块体。lambda 必须写捕获列表，空列表是 `[]`。

## 修改外层存储

```carven
var count = 0;
let advance = [&count]() {
    count += 1;
    return count;
};

println(advance(), advance(), count);
```

输出 `1 2 2`。Write 捕获要求被捕获的变量可修改，闭包持有指向同一存储的别名。用 `let` 声明闭包变量，不影响已捕获的 Write 权限。捕获列表不支持 Take，也没有 `[&&count]`。

## 把行为传给函数

```carven
fn apply(callback: fn(i32) -> i32, value: i32) -> i32 => callback(value);

let factor = 2;
let scale = [factor](item: i32) => item * factor;
println(apply(scale, 21), apply([](item) => item + 1, 21));
```

输出 `42 22`。参数类型 `fn(i32) -> i32` 表示接收 `i32` 并返回 `i32` 的可调用对象。把 scale 传入时创建借用原闭包的可调用视图：apply 调用原来的闭包，闭包本身在整个调用期间保持存活。第二个调用直接传入不捕获外部值的 lambda，用 `[]` 表示空捕获列表；回调参数的期望类型为 item 提供 `i32`，因此可以省略注解。

## 闭包对象与借用视图

把下面的独立程序保存为 `multiplier.cv`，创建并返回一个保存捕获值副本的闭包，再分别复制和借用它：

```carven
fn multiplier(factor: i32) => [factor](item: i32) => item * factor;

let scale = multiplier(2);
let copy = scale;
let view: fn(i32) -> i32 = scale;

println(copy(21), view(21));
```

运行 `carven multiplier.cv`，输出 `42 42`。返回的闭包拥有 factor 的副本，因此在 multiplier 返回后仍可使用。copy 是另一个保存捕获值副本的闭包；view 借用 scale 的闭包对象。

view 不会延长 scale 的生命周期：视图存在时，scale 必须仍在作用域内，也不能被转移走。函数应返回闭包本身，而不是局部闭包的视图。返回的闭包通过 Write 捕获访问的变量，也必须比闭包活得久。

保存视图与回调失败契约的规则见[可调用视图参考](/zh/reference/closures/)。

## 用借用回调筛选集合

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

输出 `2 21`。调用期间借用数组与回调；selected 保存筛选结果，在调用后仍可使用。策略闭包保存捕获的阈值副本。函数不在结果里保留可调用视图。

## 练习

在第二个程序里复制 advance，交替调用两个副本，count 仍共享。如果把捕获改成 `[count]`，体内赋值会被拒绝。用只读返回改写它，比较快照与别名。
