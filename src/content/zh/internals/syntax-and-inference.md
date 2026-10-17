---
title: "哪些交给推断，哪些需要写明"
description: "理解上下文名字、期望类型、显式访问，以及推断的边界。"
section: internals
source: docs/language/grammar.md
---

## 让每种拼写有明确作用

为什么局部变量可以叫 `self`，却不能叫 `fn`？为什么 `.Ready` 可以省略枚举类型，而 Write 实参仍需要 `&`？Carven 把语法、名字查找和类型推断分成不同步骤。

先看一个依赖上下文的名字：

```carven
class Counter {
    value: i32,
    fn create(value: i32) -> Counter => { value: value };
    fn read(self) -> i32 => self.value;
}

let self = 4;
let cpp = Counter::create(self);
println(cpp.read()); // 4
```

在类操作的第一个参数中，`self` 表示接收者，类型来自外围类。在 `let self = 4` 中，它是普通局部名字。关联操作 `create` 没有接收者，通过 `Counter::create` 调用。

其他拼写也各有明确规则：

| 形式                             | 什么决定它的含义                                         |
| -------------------------------- | -------------------------------------------------------- |
| `fn`、`async`、`await`、`cancel` | 保留语法 token，普通绑定不能使用                         |
| `self`、`&self`、`&&self`        | 第一个无类型类操作参数选择接收者访问                     |
| `cpp`                            | 在 `import(cpp)`、`export(cpp)`、`#[cpp]` 中选择原生边界 |
| `ptr<T>`                         | 类型位置中的结构指针语法                                 |
| `r`、`f`、`c`                    | 紧邻字符串定界符时才作为前缀                             |
| `println`、`assert`、`when_all`  | 普通名字查找，需要相应默认绑定或导入                     |
| `i32`、`String`、`Vector`        | 通过普通查找选择的标准类型声明                           |

模块路径和限定名字组件还有各自接受的 token 形式。[关键字参考](/zh/reference/keywords/) 汇总保留与遮蔽规则。

## 让上下文在明确范围内补全类型

声明、参数、返回类型和目标字段可以为表达式提供期望类型，从而选择枚举成员或数字字面量，而不必重复类型：

```carven
enum State { Ready, Busy }
let state: State = .Ready;
assert(state == .Ready);

let count: usize = 3;
let next = 1 + count;
println(next); // 4
```

`State` 为 `.Ready` 提供类型。`1 + count` 中，直接出现的无后缀字面量 `1` 按 `usize` 检查，与 count 一致。如果先把该字面量存入无注解绑定，绑定已经是 `i32`，之后的使用不会再改变它。

这种推断有明确依据：外围表达式提供规则允许的证据，已有绑定保持类型。上下文不足时补上注解。[类型参考](/zh/reference/types/) 定义字面量和转换的详细规则，包括单独委托 C++ 检查的转换。

## 显式写出改变行为的选择

类型可以告诉编译器需要什么值，却不能决定调用者要借出可变存储还是交出值。因此 Write 实参重复 `&`，Take 实参重复 `&&`，闭包捕获仍然显式。具名返回复制，`return &&owner` 转移。

调用先求值被调用者，再从左到右对运行时实参各求值一次。保留所有者存储的 Read 值可以观察到允许的 Write 别名所作的修改。显式拥有副本建立独立内容，其中的视图仍保留原关系。[所有权参考](/zh/reference/ownership/) 解释这些生命周期。

失败的选择也明确可见：`?` 传播，`try` 建立恢复。恢复保留已完成的修改；需要回滚的工作流应实现回滚。

## 区分执行权限与执行阶段

`const fn` 让函数能够在编译期执行。`const` 初始化器、块和静态测试选择那个阶段，普通调用仍在运行时。`const` 参数为特化固定一个输入，其他输入仍可来自运行时。

`const if` 选择生成分支，所有源分支仍接受类型、访问、所有权和失败检查。[编译期文章](/zh/features/compile-time/) 展示如何据此准备数据和运行时工作。

## 显式表达异步执行

异步调用创建冷操作，即描述尚未启动工作的值。`Operation<T, throw E>` 类型记录成功结果 `T` 和失败 `E`。`await` 启动或观察操作，`async let` 启动由当前作用域负责的子任务，`cancel child` 请求取消。

`when_all` 按输入顺序将结果放入元组，选择操作要求共同的成功结果类型。子任务关闭等待工作和清理完成，再释放借用的数据。[作用域示例](/zh/playground/#example=async-scope) 展示了为什么仅请求取消还不够。

`when_all`、`yield_once`、`close` 等名称需要导入并遵循普通查找。`100ms` 可以在不导入类型名时构造受检查时长，显式 `Duration` 注解则需要导入。完整规则见[异步](/zh/reference/async/)、[时间](/zh/reference/time/)和[模块](/zh/reference/modules/)。

## 从接口推断泛型形状

`fn relay<T>(&&value: T) -> T` 这样的泛型函数能够转移值，而不假设未知 `T` 可以复制、比较、默认构造或格式化。即便未使用，函数体也要按这些限制接受检查。类型参数和失败集合参数表示不同种类的信息。

调用处的推断使用声明的参数形状、实际实参类型和直接期望结果。`Operation<T, throw E>` 能同时提供结果类型和失败集合的证据。证据有歧义时，写出显式参数；编译器不会查看泛型函数体或之前的调用来猜测缺失类型。
