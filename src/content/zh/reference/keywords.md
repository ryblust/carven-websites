---
title: "关键字索引"
description: 按关键字拼写查找声明、控制流、模块、失败处理和编译期语法。
section: reference
lesson: 1
source: docs/language/grammar.md
---

## 关键字索引

下表列出词法上全局保留的 33 个关键字，不能用作普通变量、参数、字段、函数或类型的名字。其他特殊拼写有的依赖上下文，有的通过普通名字查找解析，具体区别见表后说明。模块路径组成部分可以使用关键字拼写，遵循[模块路径规则](/zh/reference/modules/)。

| 关键字                                        | 作用                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `as`                                          | [显式类型转换](/zh/reference/types/#as-转换表)或[导入别名](/zh/reference/modules/#导入别名) |
| [`async`](/zh/reference/async/)               | 声明异步函数，或用 async let 启动子任务                                                     |
| [`await`](/zh/reference/async/)               | 在所属执行上下文等待完成                                                                    |
| [`cancel`](/zh/reference/async/)              | 请求取消一个 async let 子任务                                                               |
| [`break`](/zh/reference/control/#break)       | 退出最近的循环                                                                              |
| [`catch`](/zh/reference/failures/)            | 处理匹配的类型化失败                                                                        |
| [`class`](/zh/reference/aggregates/)          | 声明带私有字段和操作的值类                                                                  |
| [`const`](/zh/reference/constants/)           | 声明常量、编译期函数与静态控制                                                              |
| [`continue`](/zh/reference/control/#continue) | 进入循环的下一次迭代                                                                        |
| [`else`](/zh/reference/control/#if)           | if 未选中其他分支时的分支                                                                   |
| [`enum`](/zh/reference/aggregates/)           | 声明数值或载荷枚举                                                                          |
| [`export`](/zh/reference/modules/)            | 声明对外可见的模块接口                                                                      |
| [`false`](/zh/reference/lexical/)             | 布尔假字面量                                                                                |
| [`fn`](/zh/reference/functions/)              | 声明函数或可调用视图类型                                                                    |
| [`for`](/zh/reference/control/#for)           | 遍历序列或执行带步进的循环                                                                  |
| [`if`](/zh/reference/control/#if)             | 条件分支、值分支与模式守卫                                                                  |
| [`import`](/zh/reference/modules/)            | 导入模块、C++ 头文件或原生函数                                                              |
| [`in`](/zh/reference/control/#for)            | 引入 for 的遍历源                                                                           |
| [`is`](/zh/reference/control/)                | 按兼容类型匹配模式                                                                          |
| [`let`](/zh/reference/bindings/)              | 声明不可重新赋值的运行时变量                                                                |
| [`match`](/zh/reference/control/)             | 按穷尽模式选择分支                                                                          |
| [`nullptr`](/zh/reference/pointers/)          | 空指针字面量                                                                                |
| [`private`](/zh/reference/modules/)           | 限制模块声明或类操作的可见性                                                                |
| [`rethrow`](/zh/reference/failures/)          | 重新抛出当前正在处理的失败                                                                  |
| [`return`](/zh/reference/control/#return)     | 从当前函数或 lambda 返回                                                                    |
| [`struct`](/zh/reference/aggregates/)         | 声明具名字段的值结构体                                                                      |
| [`test`](/zh/reference/entry-testing/)        | 声明运行时或编译期测试                                                                      |
| [`throw`](/zh/reference/failures/)            | 抛出失败或声明函数失败契约                                                                  |
| [`true`](/zh/reference/lexical/)              | 布尔真字面量                                                                                |
| [`try`](/zh/reference/failures/)              | 建立失败恢复范围或产生恢复结果                                                              |
| [`using`](/zh/reference/modules/)             | 选择导入的名字                                                                              |
| [`var`](/zh/reference/bindings/)              | 声明可更新的运行时变量                                                                      |
| [`while`](/zh/reference/control/#while)       | 执行带条件或无条件的循环                                                                    |

## 上下文关键字 self

`self` 在词法上是标识符。在类操作的首参数位置，这个名字选择接收者，必须省略类型标注：`self` 是 Read，`&self` 是 Write，`&&self` 是 Take。`fn read(self: Counter)` 会被拒绝，类操作的后续参数也不能命名为 `self`。在该参数列表之外，`let self = 2;` 等普通绑定和 `fn echo(self: i32) -> i32 => self;` 等自由函数参数合法。完整形式见[值类](/zh/reference/aggregates/#普通值类)。

```carven run
class Counter {
    value: i32,
    fn create(value: i32) -> Counter => { value: value };
    fn read(self) -> i32 => self.value;
}

let counter = Counter::create(3);
println(counter.read()); // 3
```

## 其他特殊拼写

| 拼写                                          | 特殊含义出现的位置                                             | 离开该位置后                         |
| --------------------------------------------- | -------------------------------------------------------------- | ------------------------------------ |
| `cpp`                                         | `import(cpp)`、`export(cpp)` 与精确拼写的 `#[cpp]` 片段标记    | 普通标识符，例如 `let cpp = 3;`      |
| `r`、`f`、`c`                                 | 紧贴定界符的原始、插值与 C 字符串前缀                          | 普通标识符；空白会打断前缀邻接       |
| `_`                                           | 丢弃绑定与通配模式                                             | 丢弃变量不可引用；`_name` 是普通名字 |
| `i32`、`String`、`Vector`、`Range`、SIMD 名字 | 标准模块默认提供的名字，别名仍指向同一类型                     | 声明、导入与类型参数可遮蔽           |
| `ptr`                                         | 指针类型语法；不能用作模块声明名、类型参数名或导入后的局部名字 | 普通运行时局部变量仍可使用该名字     |
| `println`、`assert` 等内建可调用值            | 普通查找在没有更近声明遮蔽时找到内建项                         | 可以被普通声明遮蔽                   |

在类型位置，`ptr` 必须带 `<...>` 类型形式；定义名为 `ptr` 的普通值绑定不会让 `ptr` 成为独立类型。

这些机制各有边界：具有上下文含义，不代表在所有位置都被保留，词法上是标识符也不保证每个声明位置都能使用该拼写。没有将 `if` 转义成变量名的语法。`new`、`delete`、`static` 仍是普通标识符。

## 关键字组合

同一个关键字可以参与多种语法形式。下表给出组合的查阅入口。

| 拼写                                      | 规则                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `const name = ...`                        | [常量声明](/zh/reference/bindings/#const)                                                               |
| `const fn`                                | [编译期函数](/zh/reference/constants/#const-fn)                                                         |
| `const async fn`                          | [编译期异步函数](/zh/reference/async/#静态参数与执行)                                                   |
| `async let` / `cancel child;`             | [子任务与取消](/zh/reference/async/#作用域内的子任务与取消)                                             |
| `await operation?`                        | [完成与失败传播](/zh/reference/async/#冷操作与-await)                                                   |
| `fn name<T, throw E>`                     | [参数化函数](/zh/reference/functions/#参数化函数)及[失败集合参数](/zh/reference/failures/#失败集合参数) |
| `const name: T`（函数参数）               | [静态参数](/zh/reference/functions/#静态参数)                                                           |
| `const if` / `const for`                  | [静态控制](/zh/reference/functions/#静态控制)                                                           |
| `const { ... }` / `const "label" { ... }` | [常量块](/zh/reference/constants/#常量块)                                                               |
| `const test`                              | [编译期测试](/zh/reference/entry-testing/#const-test)                                                   |
| `import(cpp)` / `export(cpp)`             | [原生函数边界](/zh/reference/interop/)                                                                  |

## 内建名字与语法符号

`Operation`、`when_all` 是内建类型和操作，名字是从 `std::async` 导入的普通标识符；`async`、`await`、`cancel` 则是保留语法。`self` 在接收者位置具有上下文含义，`ptr<T>` 是有额外保留规则的结构化的类型语法。导入或别名不会改变这些语法规则。

哪些名字需要导入，见[标准模块与默认名字](/zh/reference/modules/#标准模块与默认名字)；签名与行为见[内建 API 参考](/zh/reference/library/#内建类型与操作)。

`&`、`&&`、`?`、`=>`、`..`、`..=` 是语法符号，不是关键字；其规则分别见[访问与所有权](/zh/reference/ownership/)、[失败契约](/zh/reference/failures/)、[函数](/zh/reference/functions/)和[运算符](/zh/reference/operators/)。类型拼写与可用类型见[类型与转换](/zh/reference/types/)。
