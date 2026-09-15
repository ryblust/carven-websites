---
title: 结构体、数组与枚举
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

fn main() {
    let item = Item { quantity: 3, price: 12 };
    println(total(item));
}
```

输出 `36`。字段名对应声明，每个字段恰好初始化一次。命名形式按写出顺序求值；位置形式按声明顺序对应字段。结构体按声明身份定型，不因字段相同就与另一个结构体兼容。

## 数组与迭代

```carven
fn main() {
    var counts = [1, 2, 3];

    for &count in counts {
        count += 1;
    }

    println(counts[0], counts[1], counts[2]);
}
```

输出 `2 3 4`。长度是类型的一部分。空数组需要注解，如 `[i32; 0]`。动态索引越界终止，常量越界在编译期报错。循环中的 & 提供元素 Write 访问，不转移整个数组。

## 枚举表达互斥状态

```carven
enum Reply {
    Empty,
    Number(i32),
}

fn describe(reply: Reply) -> i32 {
    return match reply {
        .Empty => 0,
        .Number(value) => value,
    };
}

fn main() {
    println(describe(Reply::Number(42)), describe(Reply::Empty));
}
```

输出 `42 0`。载荷 case 用调用构造，无载荷 case 直接是值。match 要穷尽，新增 case 后旧匹配可能需要更新。裸模式名字创建绑定，`_` 忽略载荷。

只含无载荷 case 的枚举属于数值枚举，可指定整数底层类型和值。有载荷的枚举不能再指定整数值。`.Number(42)` 简写需要期望枚举上下文，不会全局搜索 case。

## guard 与覆盖

可以写 `.Number(value) if value > 0 => value,`，但 guard 可能拒绝，仍需后面的 `.Number(_)` 覆盖其余值。模式匹配先复制绑定，再执行 guard。guard 不能修改正在匹配的重叠存储；选中 arm 的 body 可以修改。

## 练习

给 Reply 增加 `Pair(i32, i32)`，在 describe 中返回两个载荷之和。尝试遗漏 Pair 分支，观察穷尽性诊断；补齐后 `Pair(20, 22)` 应得到 42。
