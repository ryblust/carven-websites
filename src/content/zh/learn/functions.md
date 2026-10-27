---
title: "用函数组织计算"
description: 拆分计算，声明参数类型，明确每条路径的返回值。
section: learn
lesson: 4
source: docs/language/functions.md
---

## 为计算命名

计算一条订单的合计，再应用折扣并打印结果。为每项计算定义一个函数：

```carven run
fn line_total(price: i32, quantity: i32) -> i32 => price * quantity;

fn discount(total: i32) => total - 3;

println(discount(line_total(12, 3)));
```

输出 `33`。声明和顶层语句可以写在同一文件中：函数是声明，最后的 `println` 组成程序入口。普通参数类型必须写明。`=> expression;` 是表达式体，函数返回该表达式的值。`line_total` 写明 `i32` 结果；discount 从表达式推断 `i32`。短计算通常写成表达式体。

## 块体显式 return

计算需要多条语句时，写成块体。普通函数块的最后一个表达式不会自动返回。有返回值的函数在每条正常执行路径上都需要 return：

```carven run
fn delivery(total: i32) -> i32 {
    if total >= 100 => return 0;

    return 8;
}

println(delivery(36));
```

输出 `8`。显式结果类型让返回的字面量使用 `i32`。省略结果注解时的推断规则见[函数参考](/zh/reference/functions/)。

用于产生值的 if 是表达式，所以这个选择也能写成表达式体：

```carven run
fn delivery(total: i32) -> i32 => if total >= 100 { 0 } else { 8 };

println(delivery(36), delivery(120));
```

输出 `8 0`。函数需要局部步骤或提前返回时用块体；一个表达式就能说明结果时用 `=>`。

## 执行动作的函数

有些函数主要执行动作，不需要算出一个有用的结果，它们的结果类型是 `void`：

```carven run
fn show_total(total: i32) => println("Total:", total);

show_total(36);
```

输出 `Total: 36`。show_total 的目的是打印，直接把调用写成语句即可。编译器推断结果类型为 `void`，因此可以省略 `-> void`。动作需要多条语句或用 `return;` 提前结束时，使用块体。

`void` 有一个值 `()`，称为 unit。异步章节会用它表示不返回业务结果的操作。

## 声明顺序与调用

函数可以调用同一模块中写在后面的函数，顶层语句也可以调用写在下方的函数。Carven 先收集声明，再检查函数体。调用先选择函数，再从左到右对各实参求值一次。

函数看不到顶层的 `let` 和 `var` 绑定：它们属于程序入口。所需值应作为参数传入。

递归调用与结果推断规则见[函数参考](/zh/reference/functions/)；[访问章节](/zh/learn/ownership/)将介绍参数怎样读取、修改或取走调用者的值。

## 一起返回相关结果

相关结果可以用元组一起返回。函数也可以接收一个元组，并在参数列表里为各部分命名：

```carven run
fn delivery(total: i32) -> i32 => if total >= 100 { 0 } else { 8 };
fn amount((price, quantity): (i32, i32)) -> i32 => price * quantity;
fn price_and_delivery(total: i32) -> (i32, i32) => (total, delivery(total));

let (items, shipping) = price_and_delivery(amount((12, 3)));
println(items, shipping, items + shipping);
```

把它另存为一个独立程序，输出 `36 8 44`。`(i32, i32)` 写明两个位置的类型。传给 `amount` 的一对值是一个参数，不是两个参数。若 price、quantity 这样的名字应一直随数据保留，使用结构体；只是局部组合几个值时，元组就够了。

## 练习

新建一个程序，放入首例的 `line_total` 和任一种 delivery 实现。增加 `grand_total(price, quantity)`，组合这两个函数。分别打印输入 12、3 和 50、2 时的结果，应得到 `44` 和 `100`。先写块体：用 `let` 保存行合计，再返回它加上运费；然后判断改成表达式体后是否仍然易读。
