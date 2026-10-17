---
title: "用记录与集合组织数据"
description: "组合相关字段，表示不同状态，并保存数量可变的集合。"
section: learn
lesson: 5
source: docs/language/aggregates.md
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

字段名对应声明，每个字段恰好初始化一次。命名形式按写出顺序求值；位置形式如 `Item { 12, 3 }` 按声明顺序对应字段。`println(item)` 按声明顺序显示类型名和各字段，不需要自己拼接文本。结构体按声明身份定型，不因字段相同就与另一个结构体兼容。能使用结构体的代码，也能读取和构造它的字段。若字段只能通过指定操作访问，使用[访问章节](/zh/learn/ownership/#用类把字段藏起来)介绍的类。

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

零或空确实表示初始状态时，使用默认值；有业务含义的数据仍应明确赋值。数字从零开始，bool 为 false，文本和向量为空。数组和结构体把默认规则应用到每个元素或字段。枚举不会自动选择某个分支，因此含枚举字段的结构体需要显式给值。其余类型的默认规则见[聚合类型参考](/zh/reference/aggregates/)。

## 让期望类型给出结构体名

类型已知时，构造可以省略类型名。再次替换 total 之后的几行：

```carven
fn sample() -> Item => { price: 12, quantity: 3 };

let empty: Item = {};
println(total(empty), total(sample()));
println(total({ price: 5, quantity: 2 }));
```

先输出 `0 36`，再输出 `10`。sample 的结果类型、empty 的注解和 total 的参数都提供了 Item。赋值目标、结构体字段和已知类型的数组元素同样适用。这种花括号与写出类型名的形式规则相同：`{}` 默认初始化，命名字段必须写全。

没有期望类型时，`let item = { price: 12, quantity: 3 };` 以 `CV-TYPE-CONSTRUCT-CONTEXT` 被拒绝；Carven 不会按字段名去找匹配的结构体。位置形式仍要写出类型。match 分支开头的 `{}` 是空块，空构造要写成 `({})`。哪些位置提供类型，见[聚合类型参考](/zh/reference/aggregates/)。

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

可以写 `.Number(value) if value > 0 => value,`，其中的 if 是守卫条件。条件可能不成立，因此仍需后面的 `.Number(_)` 覆盖其余值。先用守卫判断是否选择这个分支；需要修改匹配数据时，放到选中分支的执行体里。

## 用 Vector 扩展集合

数组的长度写在类型里。如果保留多少条结果要由筛选过程决定，就使用 Vector：

```carven
var accepted: Vector<i32> = [];
for reading in [18, -3, 21] {
    if reading >= 0 {
        accepted.push(reading);
    }
}
let first = accepted.remove(0);
println(first, accepted.length(), accepted[0]);
```

输出 `18 1 21`。输入是含三条读数的固定数组。向量从空集合开始，留下两个非负读数，再移除并返回第一个元素。剩下的值成为索引零处的元素。`Vector<i32>` 注解告诉 `[]` 与 push 元素是什么类型。

用 push 追加、length 计数、remove 取出元素并保留剩余顺序。复制向量得到独立内容。下一章会解释如何修改和转移已有值；文本章节再介绍怎样在向量里保留独立字符串。

## 让一种记录结构容纳不同类型的值

传感器读数都需要设备编号，但读数可能是整数计数，也可能是浮点电压。类型参数让它们共享一份定义：

```carven
struct Reading<T> {
    sensor: i32,
    value: T,
}

let count = Reading<i32> { sensor: 101, value: 21 };
let voltage = Reading<f64> { sensor: 102, value: 3.3 };
println(count.value, voltage.value);
```

输出 `21 3.3`。T 是类型占位符。`Reading<i32>` 为 value 选择 i32，`Reading<f64>` 则选择 f64。两者都是具体类型，编译器照样检查每个字段。外层结构相同、某类数据变化时，这样写比重复定义结构体更方便。

## 练习

给 Reply 增加 `Pair(i32, i32)`，在 describe 中返回两个载荷之和。尝试遗漏 Pair 分支，观察 `CV-MATCH-NON-EXHAUSTIVE` 诊断；补齐后 `describe(.Pair(20, 22))` 应得到 42。最后写一个函数 `bulk() -> Item`，用表达式体构造 `{ price: 10, quantity: 12 }` 而不写 Item，并打印结果。
