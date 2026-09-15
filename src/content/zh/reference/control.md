---
title: 求值、控制流与模式
description: 运算符、短路、循环、值分支、模式绑定与穷尽性。
section: reference
lesson: 11
source: docs/semantics.md
---

## 运算符域

`!` 要求 bool，数值取负要求数字，`~` 要求整数。算术与排序要求相同数值类型；余数、位运算和移位要求整数。逻辑 `&&/||` 要求 bool，从左向右短路。外部 C++ 操作数按原生操作规则处理。

相等支持 bool、char、整数、浮点、str、String、可逐成员比较的数组/结构体/枚举，以及相同目标类型的指针。callable、入口参数、切片和 chars 范围不支持相等。浮点相等遵循 IEEE，`!=` 是其否定；`0.0` 与 `-0.0` 是相同字面量模式。

## 顺序与不活动代码

callee 在实参之前、左操作数在右操作数之前、接收者在索引之前、赋值目标在右侧之前；初始化器按源书写顺序。每次所选求值路径只求值各操作数一次。失败立即跳过当前路径后续求值。

所有源码分支，包括终止语句之后或常量证明不会执行的分支，仍做操作、结果兼容和失败消费检查。证明不活动的路径不贡献向外失败、所有权转移或可达使用证据。无返回表达式可处于类型已知的位置；调用仍须能确定 callable 类型，match 仍须能确定主体类型。

## if 与循环

if 条件、while 条件和 guard 要求 bool。值形式 if 必须有 else，正常完成的分支结果兼容。语句形式不产生值。

```carven
let amount = if true { 10 } else { 20 };
```

while 每次体执行前检查条件。C 风格 for 建立循环作用域，初始化一次，检查条件，执行体，再按书写顺序执行步进。省略条件视为 true，continue 先进入步进，break 退出。

整数范围 `begin..end` 两端求值一次，要求兼容整数类型，遍历递增半开区间。begin 大于等于 end 时为空；范围绑定不能 Write。数组允许 Read 与可变源的 Write 迭代，切片与 chars 只允许 Read。

范围绑定不能 Take，名字不在自己的类型和范围源中可见。数组迭代保留对源 owner 的访问直到退出，不能在遍历期间 Take 整个数组。写某个元素不会恢复一个不可用的完整数组。循环仅在确认游标有效后访问元素，结束检查不越界读取。

## 值分支的控制边界

return 作用于当前函数或 lambda，break/continue 作用于循环。值形式 if/match/try 的结果分支不能 return 到外围函数，也不能 break/continue 到外围循环；分支内部新建循环可接收自己的转移。违规产生 `CV-FLOW-TRANSFER-VALUE-BRANCH`。

## match 与模式

语句 match 和值 match 都必须穷尽；值 match 另要求结果兼容。主体求值一次。右值主体在 guard 拒绝之间保留；存储主体的接收者和索引只选择一次，匹配期间保持稳定。

```carven
enum Reply {
    Empty,
    Number(i32),
}

fn unpack(reply: Reply) -> i32 {
    return match reply {
        .Empty => 0,
        .Number(value) if value > 0 => value,
        .Number(_) => -1,
    };
}
```

按源码顺序选择第一个模式匹配且 guard 通过的 arm。guard 可修改其他存储、调用函数、产生失败；不能通过直接访问、别名或捕获取得与主体重叠存储的 Write/Take。选中后的 arm body 可以修改主体。

模式支持递归枚举 case、字面量、绑定、`_`、`is T` 和 `|`。没有结构体/数组解构。载荷个数精确匹配。裸标识符创建不可变 owner，绝不表示“与同名常量相等”。载荷在 case 匹配后、guard 前复制一次。

`is T` 要求主体已有兼容规范类型，在此约束下覆盖该类型。或模式各分支必须绑定同名且同类型的名字，一条分支不能重复绑定。guard 使用已建立绑定，但不贡献普通 match 的穷尽性覆盖。

同一或模式中重复或被包含的 alternative 是错误。被前面无 guard arms 完整覆盖的 arm 产生不可达警告 `CV-FLOW-UNREACHABLE-MATCH-ARM`，仍接受语义检查但不参与运行时选择。缺失 case 用确定性的最短见证说明。
