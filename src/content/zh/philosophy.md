---
title: "语言设计取舍"
description: "利用上下文推断类型，同时明确表达访问、所有权、失败处理和执行阶段。"
section: philosophy
source: docs/development/principles.md
---

## 表达程序需要作出的选择

解析配置、处理记录或启动异步工作时，程序需要明确数据由谁拥有、失败后如何处理、工作何时执行。Carven 为这些选择提供直接的源码形式，编译器据此检查程序，并选择对应的 C++ 实现。

类型和局部上下文可以补足原本需要在源码中反复书写的信息。访问变化、所有权转移、捕获和失败处理则明确可见。下面通过例子说明哪些信息来自上下文，哪些选择需要自己写出来。

## 区分语法位置与名称查找

类操作可以从所在类推断接收者的类型：

```carven run
class Counter {
    value: i32,
    fn create(value: i32) -> Counter => { value: value };
    fn read(self) -> i32 => self.value;
}

let self = 4;
let cpp = Counter::create(self);
println(cpp.read()); // 4
```

`read` 的首参数 `self` 无需类型注解，表示接收者；`let self = 4` 中的 `self` 是普通名称。`create` 没有接收者，因此通过 `Counter::create` 调用。

上下文关键字等特殊拼写只在相应语法位置具有特殊含义；内建操作由编译器定义语义，通过名称查找取得。[关键字参考](/zh/reference/keywords/)汇总保留与遮蔽规则，[内建能力与运行支持](/zh/internals/runtime-boundary/)解释模块归属与可见性。

## 让上下文补足类型

声明、参数、返回类型或目标字段可以提供表达式的期望类型：

```carven run
enum State { Ready, Busy }
let state: State = .Ready;
assert(state == .Ready);

let count: usize = 3;
let next = 1 + count;
println(next); // 4
```

`State` 确定 `.Ready` 所属的枚举。在 `1 + count` 中，直接出现且没有后缀的字面量 `1` 按 `usize` 检查。如果先把 `1` 存入无类型注解的绑定，该绑定就已确定为 `i32`，后续使用不会改变它的类型。

周围表达式提供的信息不足时，写出类型注解。已经建立的绑定保持原有类型。完整的字面量与转换规则见[类型参考](/zh/reference/types/)。

## 从接口推断泛型实参

`fn relay<T>(&&value: T) -> T` 这样的泛型函数，只使用接口声明的能力就能转移值。调用处通过接口和局部类型上下文推断泛型实参，检查调用者时无需查看泛型实现。推断与函数体检查规则见[参数化函数](/zh/reference/functions/#参数化函数)。

## 写出访问与转移选择

Write 访问使用 `&`，所有权转移使用 `&&`，闭包捕获也明确写出。阅读调用处，就能看出哪些操作会修改共享存储、哪些会转移所有权。[所有权教程](/zh/learn/ownership/)展示这些选择如何构成函数接口，复制与借用生命周期的完整规则见[参考](/zh/reference/ownership/)。

## 明确恢复方式与执行阶段

`?` 标记失败传播，`try` 把恢复放在调用者有足够信息作出处理的位置。[失败契约](/zh/features/failure-contracts/)通过解析器说明传播和转换。

`const` 初始化器明确要求编译期工作，普通函数调用仍在运行时执行。[编译期计算](/zh/features/compile-time/)利用这个区别准备 JSON 模板，再应用运行时设置。

异步语法明确表达工作及其所属作用域。[异步教程](/zh/learn/async/)讲解启动工作、收集结果和关闭子任务的流程，[语言服务器实战](/zh/learn/lsp/)将其用于消息处理和任务关闭。

## 用语义事实指导原生生成

已知类型、访问、生命周期和静态值指导传参、存储、结果构造与特化。生成代码保留必要的求值、状态修改、外部操作、失败传播和清理，再由 C++ 检查委托的原生操作、优化并生成机器码。

[C++ 生成与原生集成](/zh/features/cpp-generation/)展示生成接口和原生构建。
