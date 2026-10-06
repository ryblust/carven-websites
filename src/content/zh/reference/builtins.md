---
title: 内建函数与类型 API
description: 无需导入的输出、断言、测试、取地址、文本、序列与向量 API。
section: reference
lesson: 20
source: docs/language/execution.md
---

## 内建 API 总览

内建函数和内建类型的操作由语言直接提供，无需 `import`。`print` 等全局函数按普通名字查找解析，可以被局部声明遮蔽。标准 Crafts 的函数则需要导入，见[标准库参考](/zh/reference/library/)。

| 分类               | 入口                                                  |
| ------------------ | ----------------------------------------------------- |
| 标准输出与错误输出 | [`print`、`println`、`eprint`、`eprintln`](#输出函数) |
| 运行时断言         | [`assert`](#assert)                                   |
| 测试断言与停止     | [`check`、`require`、`fail`](#测试函数)               |
| 取地址             | [`addressof`](#addressof)                             |
| 文本查询与修改     | [`str` 与 `String`](#文本-api)                        |
| 序列查询与视图     | [数组与切片](#数组与切片-api)                         |
| 向量与掩码操作     | [SIMD 原语](#simd-原语)                               |

这九个全局内建函数没有其他需要导入的同名前置声明。下面签名中的 `...`、`T`、`N` 表示 API 的参数模式，不是可复制到源码中的用户泛型或可变参数声明。每项列出调用形式、返回值、执行行为和限制。

## 输出函数

| 调用形式                              | 返回   | 目标流 | 结尾         |
| ------------------------------------- | ------ | ------ | ------------ |
| `print(value, ...)`                   | `void` | stdout | 不追加换行   |
| `println(value, ...)` / `println()`   | `void` | stdout | 追加一个换行 |
| `eprint(value, ...)`                  | `void` | stderr | 不追加换行   |
| `eprintln(value, ...)` / `eprintln()` | `void` | stderr | 追加一个换行 |

实参是 Read 访问，从左向右各求值一次，之间插入一个空格。`print` 与 `eprint` 至少需要一个实参；带换行的两个函数可以零实参。文本原样输出，不被解释为格式字符串；需要格式化时显式传入插值表达式。

```carven
println("answer", 42); // answer 42
println(f"hex: {42:04x}"); // hex: 002a
eprintln("status", "ready"); // 写入 stderr。
```

不能打印 `void`、入口参数或字符迭代视图。结构体、枚举、数组、切片使用结构化显示；类显示类型名。打印没有类型化失败，不加 `?`；原生格式或输出错误终止。`const fn`、常量块与 `const test` 在支持的子集中可打印到编译器宿主。结构化显示、求值与缓冲规则见[格式化与输出](/zh/reference/formatting/#打印)。

## assert

| 调用形式                     | 返回   | 参数                                |
| ---------------------------- | ------ | ----------------------------------- |
| `assert(condition)`          | `void` | `bool` 条件                         |
| `assert(condition, message)` | `void` | `bool` 条件；`str` 或 `String` 消息 |

直接调用只求值条件一次。条件为 `true` 时继续；为 `false` 时求值可选消息，报告位置、条件和适用的操作数解释，然后终止执行。它不是可捕获的类型化失败。在必需的编译期执行中，失败产生诊断。

```carven
let index: usize = 1;
let values = [2, 4, 6];
let view = values.as_slice();
assert(index < view.len(), "index must be in bounds");
println(view[index]); // 4
```

消息表达式只在直接断言失败时求值；两条源码路径仍接受类型检查。通过 callable 间接调用时，实参按普通调用规则立即求值。详细报告和终止规则见[入口与测试](/zh/reference/entry-testing/#assert)。

## 测试函数

| 调用形式                        | 返回   | 失败时的行为                 |
| ------------------------------- | ------ | ---------------------------- |
| `check(condition[, message])`   | `void` | 记录失败，继续当前测试       |
| `require(condition[, message])` | `void` | 记录失败，停止当前测试       |
| `fail([message])`               | `void` | 无条件记录失败，停止当前测试 |

条件必须是 `bool`，可选消息为 `str` 或 `String`。方括号表示可选参数。直接 `check`、`require` 只在条件为假时求值消息；`fail` 总是求值提供的消息。这些测试函数需要当前测试上下文，在普通程序入口直接执行它们违反运行时契约。停止效果可以穿过嵌套 Carven 调用，清理沿途作用域，不是 `try` / `catch` 消费的类型化失败。

```carven
fn twice(value: i32) -> i32 => value * 2;

test {
    check(twice(3) == 6);
    require(twice(0) == 0, "zero must stay zero");
}
```

保存为 `main.cv`，执行 `carven --tests main.cv`。没有显式名称的测试用源位置标识；需要描述场景时可写 `test "scenario" { ... }`。普通测试在测试运行模式执行；`const test` 在语义检查期间执行，使用相同断言但受编译期能力和预算限制。详见[测试声明](/zh/reference/entry-testing/#测试声明)。

## addressof

| 调用形式            | 返回      | 要求                      |
| ------------------- | --------- | ------------------------- |
| `addressof(place)`  | `ptr<T>`  | 可寻址的 Read 位置        |
| `addressof(&place)` | `ptr<&T>` | 可寻址、允许 Write 的位置 |

位置只求值一次。新地址已知非空，指针非拥有，不延长目标的生命周期。不能对字面量临时值、常量名字或 Take 表达式取地址；不能从不可变变量取得 Write 地址。

```carven
var count = 1;
let writer = addressof(&count);
*writer += 1;
println(count); // 2
```

`addressof` 必须直接调用，不能适配为 callable 值。跨函数传递指针时，目标存活与非空是分别检查的条件。外部存储的有效性仍由提供者与调用者负责。完整规则见[指针与外部地址](/zh/reference/pointers/#用-addressof-取地址)。

## 文本 API

| 调用或投影                        | 接收者与参数                        | 结果                  |
| --------------------------------- | ----------------------------------- | --------------------- |
| `text.len()`                      | Read `str` 或 `String`              | `usize`，UTF-8 字节数 |
| `text.is_empty()`                 | Read `str` 或 `String`              | `bool`                |
| `text.bytes`                      | Read `str` 或 `String`              | 借用的只读 `[u8]`     |
| `text.chars`                      | Read `str` 或 `String`              | 只读字符迭代视图      |
| `String::from_str(text)`          | Read `str`                          | 独立拥有的 `String`   |
| `text.as_str()`                   | Read `String`                       | 借用的 `str`          |
| `text.append(source)`             | Write `String`；Read `str`          | `void`                |
| `text.append_format(f"...")`      | Write `String`；直接插值表达式      | `void`                |
| `text.push(scalar)`               | Write `String`；Read `char`         | `void`                |
| `text.clear()`                    | Write `String`                      | `void`                |
| `char::from_u32_unchecked(value)` | Read `u32`，必须是合法 Unicode 标量 | `char`                |
| `str::from_utf8_unchecked(bytes)` | Read `[u8]`，必须是合法 UTF-8       | 借用的 `str`          |

```carven
var text: String = {};
text.append("hello");
text.push('!');
let view = text.as_str();
println(view, view.len(), view.is_empty()); // hello! 6 false
```

长度按字节计数，`"我".len()` 为 3；字符遍历使用 `.chars`。保存的文本或字节视图会借用其底层存储，不能在借用存活时修改源 `String`。接收者的可写性由变量或字段决定，成员调用无需在接收者前额外写 `&`。这些成员要求直接调用，不能作为方法值提取。详细语义见[文本](/zh/reference/text/)与[插值追加](/zh/reference/formatting/#追加格式化)。

未检查的两个文本工厂不验证原生输入，调用者必须满足内容前置条件。处理尚未验证的输入时，优先使用 [UTF 标准库](/zh/reference/utf/)的检查函数。字符工厂在静态执行与解释执行中检查标量合法性；未检查的借用文本工厂目前需要原生执行。详细规则见[未检查文本构造](/zh/reference/text/#未检查文本构造)。

## 数组与切片 API

数组通过 `as_slice()` 创建只读视图；`len()`、`is_empty()` 和 `slice()` 是切片的方法，不能直接调用数组的同名方法。

| 调用                     | 接收者与参数                 | 结果                 |
| ------------------------ | ---------------------------- | -------------------- |
| `values.len()`           | Read 切片 `[T]`              | `usize`，元素数      |
| `values.is_empty()`      | Read 切片                    | `bool`               |
| `values.as_slice()`      | Read 数组                    | 借用的只读 `[T]`     |
| `view.slice(start, end)` | Read 切片；两个 `usize` 端点 | 半开范围的只读 `[T]` |

```carven
let values = [2, 4, 6];
let view = values.as_slice();
let tail = view.slice(1, view.len());
println(tail.len(), tail[0]); // 2 4
```

切片不复制元素、不延长源数组寿命，借用存活时保护源存储。`slice(len, len)` 是有效空范围；动态越界终止，必需编译期执行中的越界产生诊断。索引与迭代是语言语法，见[数组](/zh/reference/aggregates/#固定数组)、[切片](/zh/reference/slices/)与[for](/zh/reference/control/#for)。

## SIMD 原语

`u8x16`、`u8x32`、`f32x4`、`f32x8` 及对应掩码提供无需导入的 API。向量提供 `splat`、`from_array`、`load`、`load_partial`、`to_array`、`lane`、`with_lane`、`extract`；掩码提供 `from_bits`、`prefix`、`bits`、`any`、`all`、`count`、`first_or`、`select`。字节向量另有 `lookup`、`shift_left` 和 `shift_right`。浮点块重排和写回辅助函数由 `std::simd.floats` 提供。

不同向量宽度的完整签名、静态参数、边界和数学规则见[SIMD 原语参考](/zh/reference/simd/#原语操作)。`std::simd.bytes` 与 `std::simd.floats` 是在这些原语上构建的标准 Crafts，需要导入，见[标准库参考](/zh/reference/library/)。
