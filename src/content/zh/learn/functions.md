---
title: "用函数组织计算"
description: 拆分计算，声明参数类型，明确每条路径的返回值。
section: learn
lesson: 3
source: docs/language/functions.md
---

## 把计算命名

```carven
fn line_total(price: i32, quantity: i32) -> i32 => price * quantity;

fn discount(total: i32) => total - 3;

println(discount(line_total(12, 3)));
```

输出 `33`。声明和顶层语句可以写在同一文件中：函数是声明，最后的 `println` 组成程序入口。普通参数类型必须写明。`=> expression;` 是表达式体，函数返回该表达式的值。line_total 写明 `i32` 结果；discount 从表达式推断 `i32`。短计算通常写成表达式体。

## 块体显式 return

计算需要多条语句时，写成块体。普通函数块的最后一个表达式不会自动返回。值函数每条正常路径都需要 return：

```carven
fn delivery(total: i32) -> i32 {
    if total >= 100 {
        return 0;
    }

    return 8;
}

println(delivery(36));
```

输出 `8`。显式结果类型会给各 return 的字面量提供上下文。省略结果类型时，每个 return 独立推断，结果必须一致；不能由第一个 return 替后面的数字选类型。

值形式 if 是表达式，所以这个选择也能写成表达式体：

```carven
fn delivery(total: i32) -> i32 => if total >= 100 { 0 } else { 8 };

println(delivery(36), delivery(120));
```

输出 `8 0`。函数需要局部步骤或提前返回时用块体；一个表达式就能说明结果时用 `=>`。

## 执行动作的函数

不返回值的函数推断为 void：

```carven
fn show_total(total: i32) => println("Total:", total);

show_total(36);
```

输出 `Total: 36`。表达式体也可以返回 `void` 调用，无需显式写 `-> void`。把 show_total 调用写成语句；它没有可保存到局部变量的结果。动作需要多步操作或用单独的 `return;` 提前结束时，使用块体。

## 声明顺序与调用

函数可以调用同一模块中写在后面的函数，顶层语句也可以调用写在下方的函数。Carven 先收集声明，再检查函数体。调用先选择函数，再从左到右对各实参求值一次。

函数看不到顶层的 `let` 和 `var` 绑定：它们属于程序入口。所需值应作为参数传入。

相互递归的函数应写明结果类型，避免推断一个结果时又依赖另一个结果。完整推断规则见[函数参考](/zh/reference/functions/)；[访问章节](/zh/learn/ownership/)将展示参数何时读取保存的值，何时保留调用者的存储。

## 练习

增加一个 `grand_total(price, quantity)`，组合 line_total 和 delivery。输入 12、3 应得到 44；输入 50、2 应得到 100。先写块体：用 `let` 保存行合计，再返回它加上运费；然后判断改成表达式体后是否仍然易读。
