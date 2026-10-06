---
title: 变量声明与作用域
description: let、var、const 的声明形式、初始化、类型推断、赋值和名字作用域。
section: reference
lesson: 4
source: docs/language/ownership.md
---

## 声明形式

使用 `let` 声明不可重新赋值的运行时变量，使用 `var` 声明可更新的运行时变量，使用 `const` 声明编译期常量。三种声明都必须提供初始化器，以分号结束；类型注解可以省略。

```text
let name[: Type] = expression;
var name[: Type] = expression;
const name[: Type] = expression;
```

```carven
let price = 12;
var quantity: i32 = 2;
const limit = 10;
quantity += 1;
println(price * quantity, limit); // 36 10
```

| 声明    | 初始化时间 | 可以重新赋值 | 常用场景                         |
| ------- | ---------- | ------------ | -------------------------------- |
| `let`   | 运行时     | 否           | 中间结果、不会改变的局部值       |
| `var`   | 运行时     | 是           | 累加器、循环状态、需要修改的数据 |
| `const` | 编译期     | 否           | 固定数据、数组长度、静态参数输入 |

优先使用 `let`；确实需要修改绑定或其字段、数组元素时使用 `var`。需要编译期值时使用 `const`。运行时 `let` 即使由字面量初始化，也不能代替静态参数要求的 `const`。

## let 与 var

`let` 与 `var` 创建拥有其值的局部绑定。`var` 允许赋值、复合赋值，以及通过 Write 参数修改；`let` 不提供这些权限。访问指针目标仍由指针类型的目标权限决定。

```carven
fn increment(&value: i32) {
    value += 1;
}

var total = 0;
increment(&total);
total = total + 2;
println(total); // 3
```

调用中的 `&` 必须与声明中的 Write 参数匹配。复制、转移和借用的详细规则见[访问与所有权](/zh/reference/ownership/)。

以下是分别被拒绝的写法：

```carven
let count = 1;
count = 2; // 编译错误：let 不可重新赋值。
```

```carven
var count: i32; // 编译错误：声明必须带初始化器。
```

## const

`const` 初始化器必须能在编译期执行；调用 Carven 函数时，该函数必须声明为 `const fn`。类型检查、执行能力和执行预算都适用于初始化器。

```carven
const fn twice(value: i32) -> i32 => value * 2;

const capacity = twice(3);
let values: [i32; capacity] = [1, 2, 3, 4, 5, 6];
println(values.as_slice().len()); // 6
```

模块层级的常量必须有名字。`const fn`、`const` 块、静态参数、`const if` 和 `const for` 的规则见[常量与编译期计算](/zh/reference/constants/)与[函数](/zh/reference/functions/)。

## 类型注解与推断

类型注解为初始化器提供期望类型。省略注解时，从初始化表达式确定类型：无后缀整数通常为 `i32`，无后缀浮点数通常为 `f64`。绑定建立以后，后续赋值或使用不会改变其类型。

```carven
let small: u8 = 12;
let wide = 12i64;
var count = 1;
count = 2;
println(small, wide, count); // 12 12 2
```

不能把一个已确定为 `i64` 的变量直接赋给 `i32` 变量；明确需要转换时，使用允许的 [`as` 转换](/zh/reference/types/#as-转换表)。不能省略初始化器来请求默认值；需要默认初始化时写 `var count = i32 {};` 或相应的 `Type {}`。

## 作用域与遮蔽

局部名字在自己的类型和初始化器检查完成之后才可见。初始化器里的同名引用使用外层已有绑定。函数体、分支和循环建立相应的局部作用域。

```carven
let value = 4;
if true {
    let value = value + 1;
    println(value); // 5
}
println(value); // 4
```

顶层 `let`、`var` 是隐式程序入口的局部变量，模块函数不能捕获它们。顶层 `const` 是模块常量，可以被函数引用。模块名字查找与可见性见[模块](/zh/reference/modules/)。

## 丢弃绑定 `_`

`_` 表示丢弃名字，不创建可引用的变量，可以重复使用；`_name` 是普通变量名。运行时丢弃仍会执行初始化器，产生的值保留到外围作用域结束。局部 `const _` 仍要求编译期初始化器；模块常量不能用 `_` 命名。

```carven
let _ = 1 + 2;
let _ = 3 + 4;
let _answer = 42;
println(_answer); // 42
```

## 相关条目

[类型与转换](/zh/reference/types/) · [运算符与表达式](/zh/reference/operators/) · [访问与所有权](/zh/reference/ownership/) · [关键字索引](/zh/reference/keywords/)
