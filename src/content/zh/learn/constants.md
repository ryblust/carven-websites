---
title: "在编译期构造数据"
description: 用 `const fn` 组织循环和文本构造，认识冻结和执行阶段。
section: learn
lesson: 13
source: docs/language/constants.md
---

## 准备一个静态标题

```carven
const fn title(value: i32) -> String {
    println("Preparing title");
    return f"Build {value:04}";
}

const heading = title(42);

const test "heading" {
    check(heading == "Build 0042");
}

println(heading);
```

使用 `carven main.cv` 时，编译阶段输出 `Preparing title`，随后启动的程序输出 `Build 0042`。单独运行已生成的可执行文件只输出 `Build 0042`。heading 的最终类型是 `str`；`String` 在计算时拥有内容，在常量初始化完成时冻结为静态文本。

## `const fn` 不意味着每次编译期运行

普通运行时表达式中的 `title(42)` 仍是普通函数调用。声明 `const fn` 只是让它具备静态执行能力；只有 `const` 初始化、数组长度、常量块、`const test` 等上下文要求编译期执行，而且这些上下文只能调用显式声明为 `const fn` 的函数。

`const fn` 内可以写局部变量、循环、支持的数组、切片和结构体以及 `String` 操作；普通 `const` 初始化器不能直接用任意控制流表达式，复杂逻辑放进 `const fn`。

编译器会在定义处检查每个 `const fn` 是否具备编译期执行能力，即使还没有任何调用。它能调用到的函数也必须是 `const fn`。保存为 admission.cv：

```carven
fn double(value: i32) -> i32 => value * 2;

const fn quadruple(value: i32) -> i32 => double(double(value));

println(quadruple(3));
```

`carven check admission.cv` 在定义处报告：

```text
error [CV-CONST-ADMISSION]: const fn can only call an explicitly declared const fn
```

把 double 也声明为 `const fn`，程序输出 `12`。这项检查针对操作与被调函数，而不是所有输入：除零、预算耗尽和断言失败仍要到某次调用实际执行时才会发现。

## 在编译时执行一个块

只需要执行准备工作、不需要保留结果时，使用常量块。将下面的程序单独保存为 prepare.cv：

```carven
const "prepare data" {
    var label: String = {};
    label.append("Preparing data");
    println(label);
}

println("Running");
```

`carven check prepare.cv` 在检查阶段打印 `Preparing data`，不执行程序。`carven prepare.cv` 先打印同一行，再由程序打印 `Running`。`const` 后面的字符串是可选标签，用于诊断，可以重复。`var label: String = {};` 使用上下文构造：类型标注为 `{}` 提供了类型。常量块没有尾分号，局部值在块结束时销毁。

模块作用域的块执行一次。函数体中的块对每个选定实例或展开的 `const for` 出现位置执行一次；未选中的 `const if` 分支不执行它。普通运行时控制流不选择静态工作。块可以读取外围常量、`const` 参数和 `const for` 索引，不能读取运行时参数或局部值。同一函数体中的静态操作按源码顺序执行；不同函数体与模块作用域块之间的顺序未定义。在测试体外需要断言时使用 `const test`。

## 浮点计算

```carven
const fn average(values: [f64; 3]) -> f64 {
    var total = 0.0;
    for value in values {
        total += value;
    }
    return total / 3.0;
}

const result = average([1.5, 3.0, 4.5]);

const test "average at compile time" {
    check(result == 3.0);
}

println(result);
```

这个程序在编译期计算出 `3.0`，在运行时打印。`f32`/`f64` 可以与调用、循环、数组和结构体组合。计算使用编译器宿主的原生浮点环境，不另建一套浮点算术规则。浮点数也可以在编译期格式化，例如 `const label = f"{result:.2f}";` 得到保留两位小数的文本。

## 从构造文本到保留结果

标题例子只生成一个值。再在一个完整程序中构造文本：用普通循环拼接三个名称，编译完成后只需保留结果文本。单独保存为 menu.cv：

```carven
const fn join(items: [str; 3]) -> String {
    var text: String = {};
    for item in items {
        if !text.is_empty() {
            text.append(" / ");
        }
        text.append(item);
    }
    return &&text;
}

const menu = join(["Home", "Docs", "About"]);

const test "menu" {
    check(menu == "Home / Docs / About");
}

println(menu);
```

运行 `carven menu.cv`，输出 `Home / Docs / About`。items 决定输入，join 决定拼接规则，`const` 决定执行阶段；无需另外声明结果的字符数或存储数组。

### 用 C++20 完成同一件事

下面是可单独编译的手写对照，不是 Carven 的生成代码。先保留相同的 join 算法，再用 freeze 为计算结果建立静态存储：

```cpp
#include <array>
#include <iostream>
#include <string>
#include <string_view>

constexpr std::string join(std::array<std::string_view, 3> items) {
    std::string text;
    for (auto item : items) {
        if (!text.empty()) {
            text.append(" / ");
        }
        text.append(item);
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
    return join({"Home", "Docs", "About"});
}>();
constexpr std::string_view menu{data.data(), data.size()};
static_assert(menu == "Home / Docs / About");

int main() {
    std::cout << menu << '\n';
}
```

保存为 menu.cpp，用支持 C++20 `constexpr` string 的工具链运行 `c++ -std=c++20 menu.cpp -o menu`，再运行 `./menu`。输出相同，`static_assert` 与 `const test` 都在编译时检查结果。

按源码顺序看，join 负责计算；freeze 先取得结果长度，用它确定 array 的类型，再写入字符；data 保留这些字符，menu 只提供视图。C++20 允许在常量求值期间临时分配内存，但不能把这次求值中仍未释放的动态分配直接保留为结果。这里的数组负责跨过这道存储边界。 参见 [C++20 常量表达式规则](https://timsong-cpp.github.io/cppwp/n4868/expr.const)。

Carven 将这一步纳入常量初始化：计算中的 `String` 最终冻结为 `str`。C++ 项目也可以把 freeze 封装进静态字符串库；这份对照把封装内部需要完成的工作展开了，不代表唯一写法。

把两边的 About 改成 Getting started，并更新断言。结果长度改变，Carven 的源码仍只需关心文本内容；C++ 的 freeze 模板会重新确定数组长度。这个例子展示的是构造与存储的分工，不是运行速度比较。

## 在编译期传递区间

控制流一章中的区间也是可在编译期使用的值。sum 接收区间，`const` 初始化决定这次调用在编译期执行。

```carven
const fn sum(values: range<i32>) -> i32 {
    var total = 0;
    for value in values {
        total += value;
    }
    return total;
}

const values = 1..=4;
const total = sum(values);

const test "range total" {
    check(total == 10);
}

println(total);
```

程序输出 `10`。`..` 与 `..=` 的端点规则在编译期和运行时相同；区间模式也可用于 `const fn` 中的整数分类。

## 静态表格

```carven
const table: [i32] = [2, 4, 6];
const middle = table.slice(1, 3);

println(middle.len(), middle[0]);
```

输出 `2 4`。slice 参数为无后缀的边界字面量提供 `usize` 类型，无需额外后缀。这是具有静态 backing 的冻结切片，可以返回与长期保存。普通运行时局部数组的 view 不具有这个生命周期。

## 筛选路由表

`const fn` 中也可以使用切片、Write 参数和字节迭代。保存为 routes.cv，它只保留已启用、以 `/` 开头且不含空格的路径：

```carven
struct Route {
    path: str,
    enabled: bool,
}

const fn valid_path(path: str) -> bool {
    if path.is_empty() || path.bytes[0] != "/".bytes[0] {
        return false;
    }
    for byte in path.bytes {
        if byte == " ".bytes[0] {
            return false;
        }
    }
    return true;
}

const fn add_route(&text: String, path: str) {
    text.append(path);
    text.append("\n");
}

const fn route_list(routes: [Route]) -> String {
    var text: String = {};
    for route in routes {
        if route.enabled && valid_path(route.path) {
            add_route(&text, route.path);
        }
    }
    return &&text;
}

const routes: [Route] = [
    { path: "/health", enabled: true },
    { path: "/users", enabled: true },
    { path: "/debug", enabled: false },
    { path: "orders", enabled: true },
];

const endpoints = route_list(routes);

const test {
    check(endpoints == "/health\n/users\n");
}

print(endpoints);
```

`carven routes.cv` 分两行输出 `/health` 和 `/users`。数组元素都使用上下文构造，元素类型来自 `[Route]` 标注。`path.bytes` 是文本的 `[u8]` 视图，`"/".bytes[0]` 和 `" ".bytes[0]` 直接从可读文本取得 `/` 与空格的字节值。add_route 通过 `&text` 获得 Write 访问，原地追加内容。匿名 `const test` 在编译期检查结果。

把 `/debug` 改成 `enabled: true`，运行 `carven check routes.cv`。静态测试失败时，条件和操作数的格式与运行时报告相同：

```text
error [CV-CONST-TEST]: check failed
  condition: endpoints == "/health\n/users\n"
  operands:
    endpoints: "/health\n/users\n/debug\n"
```

诊断随后给出指向该 check 的源码片段。继续之前把它恢复为 `enabled: false`。

## 特化运行时函数

`const` 参数在编译时固定一个输入，其他输入与函数体仍可在运行时执行。将这个独立程序保存为 specialize.cv：

```carven
fn adjust(value: i32, const enabled: bool, const count: i32) -> i32 {
    const if enabled {
        var result = value;
        const for index in 0..count {
            result += index;
        }
        return result;
    } else {
        return value;
    }
}

println(adjust(10, true, 4), adjust(10, false, 4));
```

输出 `16 10`。`const if` 为每组不同的静态输入选择生成的分支；`const for` 展开整数区间，每个索引都是静态绑定。所有源码分支仍要检查类型、所有权与失败契约；选择分支不能修复无效契约。普通运行时 `let`、参数或 `for` 索引不能提供静态实参。转发静态输入的包装函数必须在参数声明中保留 `const`。

`const fn` 允许静态阶段执行，`const` 参数规定静态输入，两者相互独立。静态实参在特化阶段执行，随后才求值剩余运行时实参。类型与值相同的静态输入可以共享实例，其 C++ 签名只含运行时参数。带静态参数的函数只允许直接调用，不能使用 `import(cpp)` 或 `export(cpp)`。展开有有限预算，不会默默退回运行时循环。见[函数参考](/zh/reference/functions/#静态参数)。

## 在编译期验证 Unicode

常量输入与普通运行时调用使用同一套受检查 UTF 算法。保存为 unicode.cv：

```carven
import std::utf.codec using encode_utf8;
import std::utf.validation using validate_utf8;

const encoded = encode_utf8('😀');
const bytes: [u8] = encoded.bytes;
const { validate_utf8(bytes.slice(0, encoded.width))?; }

const test "UTF-8 encoding" {
    check(encoded.width == 4);
    check(bytes[0] == 0xf0);
}

println(encoded.width, bytes[0]);
```

程序输出 `4 240`。`encode_utf8` 总是返回四字节数组，但只有 `width` 个字节属于该标量编码。验证前切到这个宽度，避免把填充算成额外 NUL 字符。受检查标量转换、前缀解码与整块验证也是 `const fn`，其带类型失败需要显式 `?`。

`from_utf8` 与 `to_string` 当前需要运行时执行，因为执行器尚不支持未经检查的借用文本构造。增量 `UTF8Validator` 是类，也需要运行时执行。冻结保留结构体字段与数组元素类型，不会把含自有 `String` 的结构体字段改成 `str` 来存为常量。见 [UTF 参考](/zh/reference/utf/)。

## 用 SIMD 块统计字节

`std::simd.bytes` Craft 按固定的 32 字节逻辑块遍历。保存为 blocks.cv：

```carven
import std::simd.bytes using { block_count, load_block };

const fn count_byte(bytes: [u8], needle: u8) -> usize {
    var count: usize = 0;
    for index in 0..block_count(bytes) {
        let block = load_block(bytes, index * 32);
        count += ((block.value == needle) & block.active).count();
    }
    return count;
}

const zeros = count_byte("A\0B".bytes, 0);
const test { check(zeros == 1); }

let text: String = "A\0B";
println(zeros, count_byte(text.bytes, 0));
```

输出 `1 1`：一次统计在编译期执行，另一次在运行时执行。`block.value == needle` 返回逐通道（lane）掩码。最后一块以零填充，因此必须用 `& block.active` 排除同样可能匹配零字节的填充。部分加载只读取所给切片，无需对齐或额外填充。

内建向量还包括 `u8x16`、`f32x4`、`f32x8` 及对应掩码。原生执行在编译时选择可移植通道实现、AArch64 NEON 或由使用方启用的 x86 AVX2，不做运行时派发。逻辑宽度不承诺单个硬件寄存器或性能提升。使用 SIMD 或运行时文本支持的翻译单元必须采用一致的后端选项。静态执行遵循相同通道契约，不依赖宿主指令集。边界、静态控制与浮点限制见 [SIMD 参考](/zh/reference/simd/)。

## 检查失败和预算

`const test` 始终在语义分析时执行，不需要测试产物选项。check 失败使编译失败，但继续当前测试；require/fail 停止当前测试，后续静态测试继续。普通 test 则交给运行时 runner。编译期执行中的 assert 失败报告 `CV-ASSERT`。

整数算术在编译期与运行时完全一致，按类型宽度回绕：由 `const fn` 计算的 `2147483647 * 2` 在两个阶段都得到 `-2`。除零和非法移位量在运行时会终止程序，在编译期执行时则是编译错误。求值预算耗尽也会产生编译错误。可用操作与结果类型见[常量执行规则](/zh/reference/constants/)。

## 用相同的失败契约选择编译期配置

校验、传播和恢复也可以在 Carven 的前置编译阶段执行。这里的端口校验函数既可用于运行时，也可用于常量初始化，无须另写一套错误处理逻辑。

```carven
struct InvalidPort { value: i32 }

const fn port(value: i32) -> i32 throw InvalidPort {
    if value < 1 || value > 65535 {
        throw InvalidPort { value };
    }
    return value;
}

const fn configured_port(value: i32) -> i32 => try {
    port(value)?
} catch {
    InvalidPort(_) => 8080,
};

const selected = configured_port(0);
const explicit_port = port(443)?;

const test "port selection" {
    check(selected == 8080);
    check(explicit_port == 443);
}
```

`configured_port` 在函数内恢复无效配置。`port(443)?` 则明确将失败交给常量求值入口；把 443 改成 0，会得到编译诊断。省略 `?` 即使输入有效也不合法：一次成功求值不会取消函数的失败契约。

## 练习

把静态断言改成错误文本，确认 compile 阶段失败。再恢复并运行 `compile --stdout`：编译期输出会写到 stderr，stdout 只包含生成产物。
