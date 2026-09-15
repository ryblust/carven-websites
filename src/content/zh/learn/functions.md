---
title: 函数、返回值与表达式体
description: 拆分计算，使用参数上下文、结果推断和明确的返回路径。
section: learn
lesson: 2
source: docs/semantics.md
---

## 把计算命名

```carven
fn line_total(price: i32, quantity: i32) -> i32 {
    return price * quantity;
}

fn discount(total: i32) => total - 3;

fn main() {
    println(discount(line_total(12, 3)));
}
```

输出 `33`。普通参数类型必须写明；discount 从表达式推断 i32 结果。`=> expression;` 是单表达式返回形式，适合短计算。

## 块体显式 return

普通函数块的最后一个表达式不会自动返回。值函数每条正常路径都需要 return：

```carven
fn delivery(total: i32) -> i32 {
    if total >= 100 {
        return 0;
    }

    return 8;
}

fn main() {
    println(delivery(36));
}
```

输出 `8`。显式结果类型会给各 return 的字面量提供上下文。省略结果类型时，每个 return 独立推断，结果必须一致；不能由第一个 return 替后面的数字选类型。

## void 与副作用

没有返回操作数的函数推断 void。它可以打印或修改 Write 参数，但不能把不存在的结果绑定到局部值。`return action();` 可以转发 void；对于可失败函数，仍需在调用处写 `?`。

## 声明顺序与递归

函数可调用后面定义的函数。相互递归若需要结果推断会出现依赖环，给结果写 `-> T` 可以打断。失败集合推断与返回类型推断是两套独立事实。

调用总是先选择函数，再按从左到右求值实参。普通 Read 不代表所有类型都被复制，String 和数组读取会保留存储关系；所有权章节会用例子说明。

## 练习

增加一个 `grand_total(price, quantity)`，组合 line_total 和 delivery。输入 12、3 应得到 44；输入 50、2 应得到 100。先使用显式 return，再改成等价表达式体。
