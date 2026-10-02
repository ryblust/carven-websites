---
title: "命名与更新值"
description: 用 `let`、`var`、`const` 和类型注解表达数据，理解字面量与显式转换。
section: learn
lesson: 1
source: docs/semantics.md
---

## 保存和修改值

把下面的代码保存为 `main.cv`，用第一章的命令运行。先定义单价和数量，再修改数量、计算小计：

```carven
let unit_price = 12;
var quantity = 2;
quantity += 1;
const tax_percent: i32 = 5;
let subtotal = unit_price * quantity;
println(subtotal, tax_percent);
```

输出 `36 5`。`unit_price` 用 `let` 声明，之后不能重新赋值；`quantity` 用 `var` 声明，因此可以用 `+=` 修改。

`tax_percent` 是 `const` 常量，必须在**编译期完成初始化**。之后使用这个名字时，取得的是已算好的常量值，不会创建运行时变量。

每个声明都需要初始值。如果只想执行表达式并丢弃结果，用 `let _ = ...`；`let ignored = ...` 仍会创建名为 `ignored` 的绑定。丢弃结果不会跳过表达式的求值和清理。

## 选择类型

整数有 `i8` 到 `i64`、`u8` 到 `u64`，以及指针宽度的 `isize`/`usize`。浮点有 `f32`/`f64`，布尔是 `bool`。无后缀整数默认 `i32`，浮点默认 `f64`；类型注解可以让整数字面量采用另一种整数类型，或让浮点字面量采用另一种浮点类型。

```carven
let count: u8 = 12;
let total = count as i32;
let fraction: f32 = 1.5;
println(count, total, fraction);
```

输出 `12 12 1.5`。

**变量的类型一旦确定，就不会随之后的用法改变。** 上面的 `count` 是 `u8`，转成 `i32` 需要显式写 `as`。

条件表达式必须是 `bool`，因此 `if 1` 不合法。若要判断一个数是否非零，写 `value != 0`，或显式转换为 `bool`。

## 整数运算会回绕

```carven
let small: u8 = 250;
let wrapped = small + 10;
const folded: u8 = 250 + 10;
println(wrapped, folded);
```

输出 `4 4`。整数取负、加、减、乘和左移都按类型宽度回绕。运行时的值和编译期常量遵循同一规则，把计算移进 `const` 不会改变结果。字面量本身仍须能放进它的类型：`let big: u8 = 300;` 会以 `CV-CONST-LITERAL-RANGE` 被拒绝。

整数 cast 按目标宽度取模；它不是范围检查接口。业务中的“必须在 0 到 100 之间”应先做比较，再转换。除零和非法移位若发生在编译期求值中会报诊断，例如 `const broken: i32 = 10 / 0;`（`CV-CONST-DIVIDE-BY-ZERO`）；运行时则终止执行。它们都不是可捕获失败。

## 作用域与遮蔽

内层可声明与外层同名的变量，同一作用域不能重复声明。新声明的名字从初始化完成后开始可见，因此内层 `let value = value + 1;` 可以使用外层 value。普通函数不能隐式捕获调用者或入口的局部变量，所需值应作为参数传入。

## 练习

在第一个程序中把 quantity 改成 `let`，观察 `CV-ACCESS-IMMUTABLE` 诊断；再恢复 `var`。然后把回绕示例中的 `small` 改成 246，运行前先预测输出。把 tax_percent 改成 export 模块常量时保留类型注解，因为 `export const` 要求显式类型。
