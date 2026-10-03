---
title: 把已知的工作，提前完成
description: 用普通控制流构造常量、在编译期验证结果，并把已知结构带入原生实现。
section: compile-time
source: docs/language/constants.md
---

## 编译期也能逐步构造

根据路由配置生成启用的接口清单：用循环筛选，再逐步追加文本。Carven 的 `const fn` 在编译期直接完成这些普通操作，`const test` 则在生成任何 C++ 之前检查结果。

```carven
struct Route { path: str, enabled: bool }

const fn route_list(routes: [Route; 3]) -> String {
    var text: String = {};
    for route in routes {
        if route.enabled {
            text.append(route.path);
            text.append("\n");
        }
    }
    return &&text;
}

const endpoints = route_list([
    { path: "/health", enabled: true },
    { path: "/users", enabled: true },
    { path: "/debug", enabled: false },
]);

const test {
    check(endpoints == "/health\n/users\n");
}
```

endpoints 在编译时得到以下文本，每个路径后都有换行；禁用的 `/debug` 不进入结果。这是一份文本清单，不会创建 HTTP 路由器。

```text
/health
/users
```

函数执行期间，`String` 可以增长、复制和转移；完成常量初始化后，结果冻结为具有静态存储的 `str`。运行程序不必重新执行这段构造循环。

固定数组和支持的结构体也可以逐步构造。常量初始化完成时，数组结果还可以形成只读切片，由静态存储保存切片引用的元素。

把上面的代码保存为 `routes.cv`，在末尾追加一条打印清单的顶层语句：

```carven
println(endpoints);
```

用 `carven routes.cv` 运行即可查看清单。这时程序读取已经生成的静态文本，不再遍历配置或拼接字符串。除了打印，也可以把这份 `str` 传给接受文本的接口。

## 把构造过程与静态结果连接起来

C++ 的 `constexpr`、`consteval` 与模板同样能够表达编译期工作。下面是手写的 C++20 对照，不是编译器产物。它使用相同的输入和循环，再把文本保存在数组中，通过 `string_view` 引用：

```cpp
#include <array>
#include <string>
#include <string_view>

struct Route { std::string_view path; bool enabled; };

constexpr std::string route_list(std::array<Route, 3> routes) {
    std::string text;
    for (auto route : routes) {
        if (route.enabled) {
            text.append(route.path);
            text.append("\n");
        }
    }
    return text;
}

template <auto build>
consteval auto freeze() {
    std::array<char, build().size()> data{};
    auto text = build();
    for (std::size_t i = 0; i < data.size(); ++i) {
        data[i] = text[i];
    }
    return data;
}

constexpr auto data = freeze<[] {
    return route_list({{
        {"/health", true},
        {"/users", true},
        {"/debug", false},
    }});
}>();
constexpr std::string_view endpoints{data.data(), data.size()};
static_assert(endpoints == "/health\n/users\n");
```

`freeze` 为不同长度的结果提供静态存储。C++20 允许 `std::string` 在常量求值中分配内存，但这次分配必须在求值结束前释放。短字符串可能不分配内存，因此某些标准库实现可以直接用 `constexpr std::string` 保存这个例子的结果。数组方案也适用于更长的结果：`freeze` 先在 `build().size()` 中构造一次，确定数组类型，再执行一次，把字符复制进去。静态字符串库也可以封装这些步骤。

Carven 为支持的源语言操作执行自己的常量计算，并在初始化完成处把工作用的 `String` 冻结为 `str`。这一步在生成 C++ 之前完成，不要求对应运行时文本函数也能完成同一次 C++ 常量求值。

[深入教程](/zh/learn/constants/)逐步讲解构造与冻结过程，并提供完整的 C++20 对照。

## 一份算法，明确选择执行阶段

常量初始化、数组长度、常量块和 `const test` 等静态执行入口，只能调用声明为 `const fn` 的函数。编译器逐个检查 `const fn` 定义的编译期能力：可达的操作都必须受执行器支持，调用的函数也必须是 `const fn`。不满足时，在定义处报告 `CV-CONST-ADMISSION`，不必等到有人调用它。

`const fn` 仍是普通函数。运行时调用仍是运行时函数调用，即使实参恰好是字面量；因此 route_list 也能根据程序运行时才知道的路由配置构造文本。静态执行无法完成时会给出诊断，不会悄悄退回运行时。

## 固定部分输入，保留运行时工作

函数可以用 `const` 参数按配置特化，同时处理运行时数据。`const if` 为每个实例选择分支，`const for` 展开静态整数区间。所有源码分支仍要检查完整函数契约，普通运行时变量不能提供静态输入。

这套机制也为 SIMD 提取、字节移位等操作提供固定控制值。[教程](/zh/learn/constants/#特化运行时函数)给出完整的运行时特化例子，[SIMD 参考](/zh/reference/simd/)说明通道操作和原生后端选择。提取偏移和移位量在编译时确定，成为生成的 C++ 模板参数；其余数据仍可在运行时处理。

## 验证发生在程序运行之前

示例中的 `const test` 在编译分析中执行，不依赖运行时测试产物开关。把 `/debug` 改为 `enabled: true`，再运行 `carven check routes.cv`：检查失败，并报告条件和计算得到的端点值。

```text
error [CV-CONST-TEST]: check failed
  condition: endpoints == "/health\n/users\n"
  operands:
    endpoints: "/health\n/users\n/debug\n"
 --> routes.cv:21:5
```

报告随后列出测试与失败检查所在的源码行。验证成功后，无需在目标程序中保留这条测试。它适合检查常量算法、生成表和固定数据的约束。

编译期执行也支持显式打印，用于观察构造和验证过程。输出属于该阶段；后续编译失败不会撤回已经输出的内容。

## 动态值，也能利用已知结构

提前工作不要求整个结果都是常量。例如运行时订单号的值未知，格式中的固定文字、整数进制和补零宽度仍然已知：

```carven
fn print_order(id: i32) => println(f"Order {id:08x}");
```

对这条整数格式，Carven 预先分析固定片段和转换要求，生成直接使用这些信息的写入操作。运行时完成数字转换和目标存储管理，无需再解析这条格式。已有的大小界限也参与容量准备。

**能算出的结果提前算，已知的结构提前准备。** 需要通用原生格式化的形式仍使用相应路径；实参的求值、副作用、借用观察与失败行为保持原有语义。

## 组合值、控制流与失败契约

静态执行支持整数、`f32`/`f64`、布尔、字符、文本及其字节视图、C 字符串、SIMD 向量与掩码、受支持的固定数组、切片、结构体与枚举。`const fn` 可以使用相应的控制流、Read 与 Write 参数、指向存活局部值的指针，以及对 `const fn` 的调用，包括通过绑定了具名 `const fn` 的局部变量调用。原生操作、文本字符迭代、类，以及没有 Carven 函数体的可调用值不在这个范围内。执行步骤、递归深度、文本与聚合工作量都有上限。

整数运算在两个阶段都按类型位宽回绕。除以零和非法移位在编译期执行到时给出诊断。

`const fn` 也能执行 typed failure 的抛出、传播、匹配恢复和重抛；同一套校验逻辑可服务编译期配置与运行时输入。参见[失败契约示例](/zh/learn/constants/#用相同的失败契约选择编译期配置)。浮点算术遵循编译器宿主的原生环境，浮点打印与格式化复用原生标准库规则。可用操作、结果类型与资源限制见[常量执行规则](/zh/reference/constants/)。

受检查 Unicode 标量转换、UTF-8 编码、前缀解码与整块验证使用库中的 `const fn` 实现，能够在原生编译前检查固定数据，并使用与运行时调用相同的带类型失败。借用/自有文本工厂与增量验证器目前需要运行时执行，见 [Unicode 示例](/zh/learn/constants/#在编译期验证-unicode)。

冻结保留字段与元素类型，不会把结构体或数组中的自有 `String` 改成 `str`；完成的聚合常量必须已经具有可冻结的组件。

## 不保留结果的编译期工作

`const { ... }` 在语义分析时执行支持的语句，例如准备文本并输出检查信息；它不产生运行时代码。可选标签（如 `const "prepare table" { ... }`）在诊断中标识这个块。需要保存值时使用 `const` 绑定，需要断言时使用 `const test`。三种形式都参与 `carven check`，不必先生成 C++。常量块中的控制流和局部值仍遵循相同的类型、访问与执行预算规则。
