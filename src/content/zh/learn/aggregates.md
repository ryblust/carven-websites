---
title: "记录与集合"
description: "组合相关字段，表示不同状态，并保存数量可变的集合。"
section: learn
lesson: 5
source: docs/language/aggregates.md
---

## 结构体表达一条记录

把单价和数量保存在同一个值中，再把它传给合计函数。用结构体声明这两个字段：

```carven run
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

字段名对应声明，每个字段恰好初始化一次。命名形式按写出顺序求值；位置形式如 `Item { 12, 3 }` 按声明顺序对应字段。`println(item)` 按声明顺序显示类型名和各字段，不需要自己拼接文本。结构体的类型由声明决定；两个结构体即使字段相同，也不是同一种类型。能使用结构体的代码，也能读取和构造它的字段。若字段只能通过指定操作访问，使用[访问章节](/zh/learn/ownership/#用类控制字段访问)介绍的类。

## 从默认值开始

替换第一个例子的最后三行，保留 `Item` 和 `total`：

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

空花括号将整个 `Item` 默认初始化，两个整数都是零。只指定部分字段时，用末尾的 `...` 默认初始化其余字段：`Item { price: 12, ... }` 的 quantity 是零。`...` 必须位于最后，后面不加逗号。不写该标记时，`Item { price: 12 }` 仍不完整。

零或空确实表示初始状态时，使用默认值；有业务含义的数据仍应明确赋值。各类值的默认初始化规则见[聚合类型参考](/zh/reference/aggregates/)。

## 按期望类型构造结构体

类型已知时，构造可以省略类型名。再次替换 `total` 之后的几行：

```carven
fn sample() -> Item => { price: 12, quantity: 3 };

let empty: Item = {};
println(total(empty), total(sample()));
println(total({ price: 5, quantity: 2 }));
```

先输出 `0 36`，再输出 `10`。`sample` 的结果类型、empty 的注解和 `total` 的参数都提供了 `Item`。`{}` 默认初始化整个值。具名构造也可使用末尾默认标记：`let sample: Item = { price: 12, ... };`。

没有期望类型时，`let item = { price: 12, quantity: 3 };` 以 `CV-TYPE-CONSTRUCT-CONTEXT` 被拒绝；Carven 不会按字段名去找匹配的结构体。其他构造位置的规则见[聚合类型参考](/zh/reference/aggregates/)。

## 数组与迭代

```carven run
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

```carven run
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

带数据的枚举分支用调用构造，不带数据的分支本身就是值。match 必须覆盖所有情况，因此新增分支后，已有匹配可能需要更新。模式中的单个名字创建绑定，`_` 忽略数据。`println` 会显示分支名及其数据。

调用中的 `.Empty` 简写可用，是因为 `describe` 的参数给出了枚举类型。数值枚举与显式分支值见[枚举参考](/zh/reference/aggregates/)。

## 模式守卫与穷尽检查

单独处理正数载荷。保留上一个程序的 `Reply`，用下面代码替换 `describe` 和后面的打印语句：

```carven
fn describe(reply: Reply) -> i32 => match reply {
    .Empty => 0,
    .Number(value) if value > 0 => value,
    .Number(_) => -1,
};

println(describe(.Empty), describe(.Number(42)), describe(.Number(-3)));
```

运行 `carven run main.cv`，输出 `0 42 -1`。守卫条件接受 42，拒绝 -3；后面的 `.Number(_)` 覆盖剩余情况。删除兜底分支会使匹配不完整。需要修改匹配数据时，把修改放在选中分支的执行体里，在 守卫条件通过后执行。

## 用 Vector 扩展集合

数组的长度写在类型里。如果保留多少条结果要由筛选过程决定，就使用 `Vector`：

```carven run
var accepted: Vector<i32> = [];
for reading in [18, -3, 21] {
    if reading >= 0 => accepted.push(reading);
}

let first = accepted.remove(0);
println(first, accepted.length(), accepted[0]);
```

输出 `18 1 21`。向量从空集合开始，push 追加两个非负读数。remove(0) 移除并返回第一个元素，21 随后位于索引零处。索引从零开始，`accepted[0]` 读取这个元素，length() 返回剩余元素个数。`Vector<i32>` 注解指定元素类型。

集合操作见[Vector 参考](/zh/reference/aggregates/)。下一章会解释如何复制、修改和转移已有值。

## 为记录的值声明类型参数

传感器读数都需要设备编号，但读数可能是整数计数，也可能是浮点电压。类型参数让它们共享一份定义：

```carven run
struct Reading<T> {
    sensor: i32,
    value: T,
}

let count = Reading<i32> { sensor: 101, value: 21 };
let voltage = Reading<f64> { sensor: 102, value: 3.3 };
println(count.value, voltage.value);
```

输出 `21 3.3`。T 是类型占位符。`Reading<i32>` 为 value 选择 `i32`，`Reading<f64>` 则选择 `f64`。两者都是具体类型，编译器仍会检查每个字段。外层结构相同、某类数据变化时，这样写比重复定义结构体更方便。

## 练习

回到包含 `Reply` 与 `describe` 的程序，给 `Reply` 增加 `Pair(i32, i32)`，在 `describe` 中返回两个值之和。尝试遗漏 Pair 分支，观察 `CV-MATCH-NON-EXHAUSTIVE` 诊断；补齐后 `describe(.Pair(20, 22))` 应得到 42。然后回到 `Item` 程序，写一个 `bulk() -> Item`，用表达式体构造 `{ price: 10, quantity: 12 }` 而不写 `Item`，并打印结果。
