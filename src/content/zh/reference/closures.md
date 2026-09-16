---
title: 闭包、捕获与可调用视图
description: 闭包身份、值捕获、Write 捕获、可调用视图适配与调用快照。
section: reference
lesson: 9
source: docs/semantics.md
---

## 创建与捕获

lambda 的捕获列表必须存在，无捕获写 `[]`。创建闭包不执行函数体，捕获按列表顺序建立，每个名字出现一次。只能捕获创建位置可见的运行时绑定；模块声明与编译期常量不显式捕获。

| 形式        | 捕获内容         | 体内权限 |
| ----------- | ---------------- | -------- |
| `[value]`   | 立即值的拥有副本 | Read     |
| `[&value]`  | 可写源存储的别名 | Write    |
| `[&&value]` | 不支持           | 编译错误 |

值捕获不可赋值，也不能 Take；Write 捕获也不能 Take 捕获绑定。每一层嵌套 lambda 都有独立捕获边界。未使用的显式捕获产生 `CV-LAMBDA-CAPTURE-UNUSED`。创建表达式不贡献闭包体的失败；实际调用使用其失败契约。

## 闭包身份与复制

每个 lambda 源表达式具有唯一具体类型，不能手写其类型名。重复执行同一表达式产生同类型值；两个看起来相同的 lambda 是不同类型。

同类型闭包赋值会复制值捕获，并让 Write 捕获指向源闭包捕获的对象，不向该对象本身赋值。`let copy = closure` 拥有独立捕获值；Write 捕获仍别名原存储。按值捕获一个含 Write 捕获的闭包后，仍允许它修改原先指向的对象。

不可变闭包 owner 可以调用其已存储的 Write 权限。Take 整个闭包使源 owner 不可用，目标保留 Write 捕获关联。复制闭包、把它放入聚合或从函数返回，都不会延长捕获所指对象的生命周期。返回引用调用者 Write 参数的闭包可以满足关系；返回引用被调用者局部 owner 的闭包不行。

## 签名上下文

期望 callable view 可以提供省略的 lambda 参数类型；无上下文时参数类型必须显式。显式返回类型优先，其次使用期望 view 返回类型，否则独立推断各 return 的一致类型。完成闭包类型前检查函数体。

```carven
fn apply(callback: fn(i32) -> i32, value: i32) -> i32 {
    return callback(value);
}

fn main() {
    let offset = 2;
    println(apply([offset](value) => value + offset, 40));
}
```

## 非拥有 callable view

`fn(...) -> R throw E + F` 是非拥有 view。参数访问、参数类型和成功结果要求精确匹配，源的失败集合可以是目标的子集。数组适配递归应用到元素，包括零长度数组。参数或成功结果类型内部的 callable 失败契约仍要求相同。

view 可作为参数、局部值和局部数组存储；不能放入结构体或枚举，不能返回或被 lambda 捕获，这些限制递归穿过数组。

捕获 lambda 临时值只有作为直接实参时可形成 view，持续到该调用结束。命名捕获闭包可在 owner 具有足够作用域时形成局部 view；它借用闭包对象，不复制捕获。借用仍活动时，闭包 owner 不能 Take；让所有借用者离开内层作用域后，仍存活的 owner 才可继续 Take。非捕获闭包形成 view 不借用闭包存储，创建表达式仍执行一次。通过 Write view 参数赋入捕获目标会被拒绝，因为参数不建立足够的 backing 生命周期。

## 同型复制与失败拓宽

同型 view 复制保存当前目标描述，保留目标 backing 要求。已有 view 拓宽失败集合时，借用源 view 的存储。源 view 重新绑定后，宽 view 观察新目标；数组逐元素拓宽亦如此。源 view 必须活得足够久，已 Take 的 view 不能充当该借用来源。

```carven
struct E {}
struct F {}

fn first(x: i32) -> i32 throw E => x + 1;

fn second(x: i32) -> i32 throw E => x + 2;

fn example() throw E + F {
    var source: fn(i32) -> i32 throw E = first;
    let copied = source;
    let widened: fn(i32) -> i32 throw E + F = source;

    source = second;

    println(copied(5)?, widened(5)?); // 6 7
}
```

宽 view 调用源 view 再适配结果；不拥有源 view，也不延长捕获存储寿命。直接把具体 callable 适配成宽 view 使用该 callable 作为目标。

## 调用时的快照

具体闭包调用先选中对象，再求值参数。参数求值期间对同一闭包对象重新赋值，会影响本次调用的捕获。view 调用先保存其目标描述：重新绑定当前 view 变量影响后续调用，修改已选中的闭包对象仍影响本次。

宽 view 的目标是源 view 对象，因此参数求值期间重新绑定源 view，本次宽 view 调用也观察到新内容。需要独立捕获快照时，先建立具体闭包的拥有副本。复制 view 只保存目标描述。
