---
title: "用结构体、数组和枚举表示数据"
description: 把相关数据放在一起，用穷尽模式表达状态。
section: learn
lesson: 4
source: docs/semantics.md
---

## 结构体表达一条记录

```carven
struct Item {
    price: i32,
    quantity: i32,
}

fn total(item: Item) -> i32 => item.price * item.quantity;

let item = Item { quantity: 3, price: 12 };
println(total(item));
println(item);
```

输出为：

```text
36
Item {
    price: 12,
    quantity: 3,
}
```

字段名对应声明，每个字段恰好初始化一次。命名形式按写出顺序求值；位置形式如 `Item { 12, 3 }` 按声明顺序对应字段。`println(item)` 按声明顺序显示类型名和各字段，不需要自己拼接文本。结构体按声明身份定型，不因字段相同就与另一个结构体兼容。结构体的字段对可见范围内的代码开放读取和构造；如果值必须只通过自身操作维护字段，改用类，见[访问章节](/zh/learn/ownership/#用类把字段藏起来)。

## 从默认值开始

替换第一个例子的最后三行，保留 Item 和 total：

```carven
let item = Item {};
println(total(item));
println(item);
```

输出为：

```text
0
Item {
    price: 0,
    quantity: 0,
}
```

空花括号将整个 Item 默认初始化，两个整数都是零。如果开始指定字段，就必须写全：`Item { price: 12 }` 不会自动补 quantity。

默认值适合表示空状态；有业务含义的数据仍应显式赋值。枚举没有默认 case，需要选择明确状态。

## 让期望类型给出结构体名

类型已知时，构造可以省略类型名。再次替换 total 之后的几行：

```carven
fn sample() -> Item => { price: 12, quantity: 3 };

let empty: Item = {};
println(total(empty), total(sample()));
println(total({ price: 5, quantity: 2 }));
```

先输出 `0 36`，再输出 `10`。sample 的结果类型、empty 的注解和 total 的参数都提供了 Item。赋值目标、结构体字段和已知类型的数组元素同样适用。这种花括号与写出类型名的形式规则相同：`{}` 默认初始化，命名字段必须写全。

没有期望类型时，`let item = { price: 12, quantity: 3 };` 以 `CV-TYPE-CONSTRUCT-CONTEXT` 被拒绝；Carven 不会按字段名去找匹配的结构体。位置形式仍要写出类型。match 分支开头的 `{}` 是空块，空构造要写成 `({})`。哪些位置提供类型，见[聚合类型 Reference](/zh/reference/aggregates/)。

## 数组与迭代

```carven
let counts = [1, 2, 3];
var total = 0;

for count in counts {
    total += count;
}

println(total);
println(counts);
```

先输出 `6`，再逐行显示数组元素：

```text
6
[
    1,
    2,
    3,
]
```

长度是类型的一部分。空数组需要注解，如 `[i32; 0]`。动态索引越界终止，常量越界在编译期报错。循环依次读取每个元素；下一章会介绍如何用 Write 访问修改原有存储。

## 枚举表达互斥状态

```carven
enum Reply {
    Empty,
    Number(i32),
}

fn describe(reply: Reply) -> i32 => match reply {
    .Empty => 0,
    .Number(value) => value,
};

println(describe(Reply::Number(42)), describe(.Empty));
println(Reply::Number(42));
```

输出为：

```text
42 0
Reply::Number(
    42,
)
```

载荷 case 用调用构造，无载荷 case 直接是值。match 要穷尽，新增 case 后旧匹配可能需要更新。裸模式名字创建绑定，`_` 忽略载荷。`println` 会显示 case 及其载荷。

只含无载荷 case 的枚举属于数值枚举，可指定整数底层类型和值。有载荷的枚举不能再指定整数值。调用中的 `.Empty` 简写之所以可用，是因为 describe 的参数提供了期望枚举；它不会全局搜索 case。

## guard 与覆盖

可以写 `.Number(value) if value > 0 => value,`，其中的 if 是守卫条件。条件可能不成立，因此仍需后面的 `.Number(_)` 覆盖其余值。模式匹配先复制绑定，再判断守卫条件。守卫条件不能修改与匹配对象重叠的存储；选中分支后的执行体可以修改。

## 练习

给 Reply 增加 `Pair(i32, i32)`，在 describe 中返回两个载荷之和。尝试遗漏 Pair 分支，观察 `CV-MATCH-NON-EXHAUSTIVE` 诊断；补齐后 `describe(.Pair(20, 22))` 应得到 42。最后写一个函数 `bulk() -> Item`，用表达式体构造 `{ price: 10, quantity: 12 }` 而不写 Item，并打印结果。
