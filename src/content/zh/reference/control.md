---
title: 分支、循环与控制转移
description: if、while、for、match、break、continue、return 的语法、执行与限制。
section: reference
lesson: 6
source: docs/language/control-flow.md
---

## 控制流总览

控制语句选择分支、重复执行或结束当前流程。`if`、`match`、`try` 还可用作产生值的表达式；`while`、`for` 是循环语句。条件必须是 `bool`，控制体使用花括号。

| 形式                                        | 用途                               |
| ------------------------------------------- | ---------------------------------- |
| `if condition { ... } else { ... }`         | 按条件选择分支                     |
| `while condition { ... }`                   | 条件为真时重复执行                 |
| `while { ... }`                             | 重复执行，直到控制转移离开循环     |
| `for value in source { ... }`               | 遍历整数区间、数组、切片或字符视图 |
| `for initializer; condition; steps { ... }` | 带初始化和步进的循环               |
| `match value { ... }`                       | 按模式选择分支                     |
| `break;` / `continue;`                      | 退出最近的循环 / 进入下一次迭代    |
| `return value;`                             | 从当前函数或 lambda 返回           |

[`try` / `catch` 与失败传播](/zh/reference/failures/)有独立章节；[`const if` / `const for`](/zh/reference/functions/#静态控制)用于静态特化。

## if

语句形式可以省略 `else`。按顺序检查条件，执行第一个为真的分支；都不满足时执行 `else`（如果存在）。没有数值或指针到 `bool` 的隐式转换。

```carven
let score = 75;
if score >= 90 {
    println("excellent");
} else if score >= 60 {
    println("pass");
} else {
    println("retry");
}
```

输出 `pass`。值形式必须有 `else`，每个正常完成的分支以末尾表达式产生兼容的结果；结果表达式后不写分号。

```carven
let score = 75;
let status = if score >= 60 { "pass" } else { "retry" };
println(status); // pass
```

值形式 `if`、`match`、`try` 的分支沿用外围期望类型，可产生[上下文构造](/zh/reference/aggregates/#上下文构造)。语句形式不产生值。值分支中不能向外层函数或循环进行控制转移，见[值分支的控制边界](#值分支的控制边界)。

```carven
let result = if true { 1 }; // 编译错误：值形式缺少 else。
```

## while

`while condition { ... }` 在每次迭代之前检查条件。条件为 `false` 时结束，可以一次也不执行。`while { ... }` 不检查条件，适用于明确在循环体内退出的流程。

```carven
var count = 0;
while count < 3 {
    println(count);
    ++count;
}
```

依次输出 0、1、2。无条件循环的例子：

```carven
var count = 0;
while {
    if count == 3 {
        break;
    }
    ++count;
}
println(count); // 3
```

语义分析只把无条件 `while { ... }` 视为不会自行结束。`while true { ... }` 仍保留条件退出的分析路径。

## for

### 遍历形式

`for name in source { ... }` 遍历整数区间、数组、只读切片或文本字符视图。绑定可以带类型注解；可写数组允许 `for &name in source` 修改元素。

```carven
var values = [1, 2, 3];
for &value in values {
    value *= 2;
}
let view = values.as_slice();
for index in 0..view.len() {
    println(view[index]);
}
```

依次输出 2、4、6。这里 `0` 从右侧的长度取得 `usize` 类型，无需额外后缀。`0..3` 不包含 3，`0..=3` 包含 3。反向区间为空；端点相等时，半开区间为空，闭区间产生一个值。闭区间可以包含整数类型的最大值，不会在最后一步溢出。

整数区间循环在开始时保存区间快照；之后修改源区间或原始端点，不改变本次遍历。整数区间绑定不能 Write；切片和字符视图只允许 Read。范围绑定不能 Take，名字不在自己的类型和范围源中可见。

数组迭代在退出前保留对源 owner 的访问，不能在遍历期间 Take 整个数组。写某个元素不会恢复不可用的完整数组。循环在确认游标有效后才访问元素，结束检查不读取越界元素。

### C 风格形式

```text
for initializer; condition; step1, step2 {
    statements
}
```

不使用围绕头部的圆括号。初始化器和步进可以省略，条件必需且为 `bool`。循环建立自己的作用域：初始化一次，每次检查条件，再执行循环体，最后按书写顺序执行步进。

```carven
var total = 0;
for var index = 0; index < 4; ++index {
    total += index;
}
println(total); // 6
```

步进允许赋值、前缀自增减与普通表达式，可以用逗号分隔多项。`continue` 先执行步进，再检查条件；`break` 直接退出。

## break

`break;` 退出最近的外围循环，不携带返回值。循环后的语句继续执行；没有循环目标时非法。

```carven
for value in 0..10 {
    if value == 3 {
        break;
    }
    println(value);
}
```

依次输出 0、1、2。

## continue

`continue;` 跳过当前循环体的剩余部分，开始下一次迭代。`while` 回到条件检查，遍历循环推进游标，C 风格 `for` 先执行步进。

```carven
for value in 0..5 {
    if value % 2 == 0 {
        continue;
    }
    println(value);
}
```

依次输出 1、3。`break` 和 `continue` 不能跳转到命名标签。

## return

`return expression;` 从当前函数或 lambda 返回成功结果；`return;` 只适用于成功结果为 `void` 的函数。函数块体不会隐式返回最后一个表达式。只返回一个表达式的函数通常写成表达式体：

```carven
fn absolute(value: i32) -> i32 => if value < 0 { -value } else { value };

println(absolute(-3)); // 3
```

返回具名 owner 默认复制；需要转移时明确写 `return &&owner;`。结果推断、所有路径返回和失败消费规则见[函数](/zh/reference/functions/)，转移规则见[所有权](/zh/reference/ownership/)。

## match 与模式

语句 match 和值 match 都必须穷尽；值 match 另要求结果兼容。主体求值一次。右值主体在 guard 拒绝之间保留；存储主体的接收者和索引只选择一次，匹配期间保持稳定。

```carven
enum Reply {
    Empty,
    Number(i32),
}

fn unpack(reply: Reply) -> i32 => match reply {
    .Empty => 0,
    .Number(value) if value > 0 => value,
    .Number(_) => -1,
};
```

按源码顺序选择第一个模式匹配且 guard 通过的 arm。guard 可修改其他存储、调用函数、产生失败；不能通过直接访问、别名或捕获取得与主体重叠存储的 Write/Take。选中后的 arm body 可以修改主体。

模式支持递归枚举 case、整数区间、字面量、绑定、`_`、`is T` 和 `|`。没有结构体/数组解构。载荷个数精确匹配。裸标识符创建不可变 owner，绝不表示“与同名常量相等”。载荷在 case 匹配后、guard 前复制一次。

`is T` 要求主体已有兼容规范类型，在此约束下覆盖该类型。或模式各分支必须绑定同名且同类型的名字，一条分支不能重复绑定。guard 使用已建立绑定，但不贡献普通 match 的穷尽性覆盖。

同一或模式中重复或被包含的 alternative 是错误。被前面无 guard arms 完整覆盖的 arm 产生不可达警告 `CV-FLOW-UNREACHABLE-MATCH-ARM`，仍接受语义检查但不参与运行时选择。缺失 case 用确定性的最短见证说明。

## 整数区间模式

整数主体和枚举中的整数载荷支持 `a..b`、`a..=b`、`..b`、`..=b`、`a..`。省略的一侧延伸到主体整数类型的对应边界；已有端点使用主体的整数类型。空区间与反向区间永不匹配。

```carven
fn inside(value: i32, low: i32, high: i32) -> bool => match value {
    low..=high => true,
    _ => false,
};
```

这里 low 和 high 是运行时端点，因此用 `_` 覆盖其余情况。只有直接已知且无需执行的端点参与静态覆盖证明；动态端点不能证明穷尽性。即使结果已知，带有副作用的端点也必须保留求值。

尝试一个模式时，才从左向右各计算一次端点，然后检查包含关系。枚举 case 不匹配、前面的载荷不匹配，或前一个或模式分支已成功，都会跳过后续端点。端点产生失败时向外传播，而非简单地尝试下一条 arm。端点不能取得主体的 Write/Take 权限，也不能引用同一模式刚引入的绑定。catch 载荷也支持递归区间模式。

例如 `..0`、`0..=100`、`101..` 覆盖所有 `i32` 值，无需通配分支。移除最后一个区间后，match 不再穷尽；guard 不能补足这个缺口。

## 值分支的控制边界

return 作用于当前函数或 lambda，break/continue 作用于循环。值形式 if/match/try 的结果分支不能 return 到外围函数，也不能 break/continue 到外围循环；分支内部新建循环可接收自己的转移。常量块具有同样的边界。违规产生 `CV-FLOW-TRANSFER-BOUNDARY`。

## 顺序与不活动代码

callee 在实参之前、左操作数在右操作数之前、接收者在索引之前、赋值目标在右侧之前；初始化器按源书写顺序。每次所选求值路径只求值各操作数一次。失败立即跳过当前路径后续求值。

所有源码操作数和分支都接受操作、结果兼容与失败消费检查，包括终止语句之后的源码。只有终止语句之后的源码不贡献运行时求值、向外失败、所有权转移或可达使用证据。无返回表达式可处于类型已知的位置；调用仍须确定 callable 类型，match 仍须确定主体类型。

条件的值不改变分析。普通 `if`、`&&`、`||`、`match` 和带条件循环的可达性、失败、所有权、指针证明与返回分析都会考察各条路径，不论条件是字面量、`const` 还是运行时值。`if false` 和 `while true` 都保留两条分析路径。只有无条件的 `while { ... }` 才被视为不会自行结束，只能通过 `break` 退出。[静态控制](/zh/reference/functions/#静态控制)显式选择特化与生成，但各源码分支仍接受检查。

## 运算符域

运算符的拼写、操作数类型和相等规则见[运算符与表达式](/zh/reference/operators/)。

## 整数区间值

`begin..end` 与 `begin..=end` 的构造、类型推断和快照规则见[区间表达式](/zh/reference/operators/#区间表达式)。

## if 与循环

各写法的语法与例子见本页的 [if](#if)、[while](#while) 和 [for](#for) 条目。
