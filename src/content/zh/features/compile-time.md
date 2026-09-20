---
title: 把已知的工作，提前完成
description: 用普通控制流构造常量、在编译期验证结果，并把已知结构带入原生实现。
section: compile-time
source: docs/semantics.md
---

## 编译期也能逐步构造

根据路由配置生成启用的接口清单：用循环筛选，再逐步追加文本。Carven 的 const fn 允许在编译期直接完成这些工作。

```carven
struct Route { path: str, enabled: bool }

const fn route_list(routes: [Route; 3]) -> String {
    var text = String {};
    for route in routes {
        if route.enabled {
            text.append(route.path);
            text.append("\n");
        }
    }
    return text;
}

const endpoints = route_list([
    Route { path: "/health", enabled: true },
    Route { path: "/users", enabled: true },
    Route { path: "/debug", enabled: false },
]);
```

endpoints 在编译时得到以下文本，每个路径后都有换行；禁用的 `/debug` 不进入结果。这是一份文本清单，不会创建 HTTP 路由器。

```text
/health
/users
```

函数执行期间，String 可以增长、复制和转移；完成常量初始化后，结果冻结为具有静态存储的 str。运行程序不必重新执行这段构造循环。

**构造过程可以可变，交付的数据保持静态。** 固定数组和支持的结构体也可以逐步构造；数组结果还可在常量初始化边界形成具有静态 backing 的只读切片。

把上面的代码保存为 `routes.cv`，追加一个打印清单的入口：

```carven
fn main() {
    println(endpoints);
}
```

用 `carven routes.cv` 运行即可查看清单。这时程序读取已经生成的静态文本，不再遍历配置或拼接字符串。将 `/debug` 的 enabled 改为 true，再次编译运行，清单便会增加 `/debug`。这里选择打印作为结果的消费方式；实际程序也可以把这份 str 交给接受文本的接口。

## 把构造过程与静态结果连接起来

C++ 的 constexpr、consteval 与模板同样能够表达编译期工作。手写原生代码时，需要按常量求值与对象存储规则选择构造方式和可保留的结果表示。

Carven 为支持的源语言操作执行自己的常量计算，并在初始化完成处处理结果冻结。例如这里的临时 String 构造最终交付静态 str；这一步由 Carven 在生成 C++ 之前完成，不要求对应运行时文本函数也能完成同一次 C++ 常量求值。

首页的 C++ 对照使用 `freeze` 模板，把计算出的字符复制到按结果长度建立的静态数组，再交给 `string_view` 引用。Carven 直接在常量初始化边界完成这项存储安排。静态字符串库也可以为 C++ 封装这些步骤。

[深入教程](/zh/learn/constants/)用菜单拼接逐步讲解相同的构造与冻结过程，提供完整的 Carven 与 C++ 运行步骤。

## 一份算法，明确选择执行阶段

在必需常量上下文调用 const fn，计算由 Carven 完成。普通运行时调用仍是运行时函数调用，即使实参恰好是字面量。

因此 route_list 既能准备固定清单，也能根据运行时的路由配置构造文本。阶段选择有明确的源码契约；常量计算无法完成时会给出诊断，不会悄悄退回运行时。

## 验证发生在程序运行之前

编译期生成的数据可以立即接受编译期测试。下面的测试与前面的 endpoints 放在同一文件：

```carven
const test "enabled endpoints" {
    check(endpoints == "/health\n/users\n");
    check(endpoints.len() == 15);
}
```

const test 在编译分析中执行，不依赖运行时测试产物开关。验证成功后，无需在目标程序中保留这条测试。它适合检查常量算法、生成表和固定数据的约束。

编译期执行也支持显式打印，用于观察构造和验证过程。输出属于该阶段；后续编译失败不会撤回已经输出的内容。

## 动态值，也能利用已知结构

提前工作不要求整个结果都是常量。例如运行时订单号的值未知，格式中的固定文字、整数进制和补零宽度仍然已知：

```carven
fn print_order(id: i32) {
    println(f"Order {id:08x}");
}
```

对这条整数格式，Carven 预先分析固定片段和转换要求，生成直接使用这些信息的写入操作。运行时完成数字转换和目标存储管理，无需再解析这条格式。已有的大小界限也参与容量准备。

**能算出的结果提前算，已知的结构提前准备。** 需要通用原生格式化的形式仍使用相应路径；实参的求值、副作用、借用观察与失败行为保持原有语义。

## 组合值、控制流与失败契约

必需常量执行支持整数、f32/f64、布尔、字符、文本、受支持的固定数组、结构体与枚举，以及相应的控制流和直接 const fn 调用。它具有执行步骤、递归深度、文本与聚合工作量限制。

const fn 也能执行 typed failure 的抛出、传播、匹配恢复和重抛；同一套校验逻辑可服务编译期配置与运行时输入。参见[失败契约示例](/zh/learn/constants/#用相同的失败契约选择编译期配置)。浮点算术遵循编译器宿主的原生环境，浮点打印与格式化复用原生标准库规则。可用操作、结果类型与资源限制见[常量执行规则](/zh/reference/constants/)。

## 不保留结果的编译期工作

`const { ... }` 在语义分析时执行支持的语句，例如准备文本并输出检查信息；它不产生运行时代码。需要保存值时使用 const 绑定，需要断言时使用 const test。三种形式都参与 `carven check`，不必先生成 C++。常量块中的控制流和局部值仍遵循相同的类型、访问与执行预算规则。
