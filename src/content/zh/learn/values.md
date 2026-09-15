---
title: 值、变量与类型
description: 用 let、var、const 和类型注解表达数据，理解字面量与显式转换。
section: learn
lesson: 1
source: docs/semantics.md
---

## 保存和修改值

保存为 main.cv 并按第一章的原生运行命令执行：

```carven
fn main() {
    let unit_price = 12;
    var quantity = 2;
    quantity += 1;
    const tax_percent: i32 = 5;
    let subtotal = unit_price * quantity;
    println(subtotal, tax_percent);
}
```

输出 `36 5`。let 的绑定不可重新赋值，var 允许修改。const 的初始化必须能在编译期完成；它的使用代表选定的常量值，没有运行时 owner。

每个声明都要初始化。`let ignored = ...` 仍创建名字；若有意丢弃，用 `let _ = ...`。丢弃不取消求值和清理。

## 选择类型

整数有 i8 到 i64、u8 到 u64，以及指针宽度的 isize/usize。浮点有 f32/f64，布尔是 bool。无后缀整数默认 i32，浮点默认 f64；注解可给字面量提供同族上下文。

```carven
fn main() {
    let count: u8 = 12;
    let total = count as i32;
    let fraction: f32 = 1.5;
    println(count, total, fraction);
}
```

一个变量定型后不会根据后续使用改类型。已有 u8 值不能自动提升为 i32，要明确 as。条件必须 bool，`if 1` 不合法；若确实需要按零/非零判断，写 `value != 0` 或显式转 bool。

## 算术的两个阶段

运行时整数加减乘和左移按类型宽度回绕。必需常量计算检查溢出。把可证明溢出的字面量运算放进 let，也不会绕过检查。

整数 cast 按目标宽度取模；它不是范围检查接口。业务中的“必须在 0 到 100 之间”应先做比较，再转换。除零和非法移位在动态执行时终止，不是可捕获失败。

## 作用域与遮蔽

内层可声明与外层同名的变量，同一作用域不能重复声明。新名字在初始化完成后才发布，因此内层 `let value = value + 1;` 可以使用外层 value。普通函数不能隐式捕获调用者或入口的局部变量，所需值应作为参数传入。

## 练习

在第一个程序中把 quantity 改成 let，观察赋值诊断；再恢复 var。把 tax_percent 改成 export 模块常量时保留类型注解，因为 export const 要求显式类型。
