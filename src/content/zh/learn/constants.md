---
title: "在编译期构造数据"
description: 用 const fn 组织循环和文本构造，认识冻结和执行阶段。
section: learn
lesson: 12
source: docs/semantics.md
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

fn main() {
    println(heading);
}
```

使用 `carven main.cv` 时，编译阶段输出 `Preparing title`，随后启动的程序输出 `Build 0042`。单独运行已生成的可执行文件只输出 `Build 0042`。heading 的最终类型是 str；String 在计算时拥有内容，在常量初始化完成时冻结为静态文本。

## const fn 不意味着每次编译期运行

普通运行时表达式中的 `title(42)` 仍是普通函数调用。声明 const fn 只是让它具备必需常量执行资格；只有 const 初始化、数组长度、const test 等上下文要求编译期执行。

const fn 内可以写局部变量、循环、支持的数组和结构体以及 String 操作；普通 const 初始化器不能直接用任意控制流表达式，复杂逻辑放进 const fn。

## 从构造文本到保留结果

标题例子只生成一个值。再把首页的文本拼接示例补成完整程序：用普通循环拼接三个名称，编译完成后只需保留结果文本。单独保存为 menu.cv：

```carven
const fn join(items: [str; 3]) -> String {
    var text = String::new();
    for item in items {
        if !text.is_empty() {
            text.append(" / ");
        }
        text.append(item);
    }
    return text;
}

const menu = join(["Home", "Docs", "About"]);

const test "menu" {
    check(menu == "Home / Docs / About");
}

fn main() {
    println(menu);
}
```

运行 `carven menu.cv`，输出 `Home / Docs / About`。items 决定输入，join 决定拼接规则，const 决定执行阶段；无需另外声明结果的字符数或存储数组。

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

保存为 menu.cpp，用支持 C++20 constexpr string 的工具链运行 `c++ -std=c++20 menu.cpp -o menu`，再运行 `./menu`。输出相同，static_assert 与 const test 都在编译时检查结果。

按源码顺序看，join 负责计算；freeze 先取得结果长度，用它确定 array 的类型，再写入字符；data 保留这些字符，menu 只提供视图。C++20 允许在常量求值期间临时分配内存，但不能把这次求值中仍未释放的动态分配直接保留为结果。这里的数组负责跨过这道存储边界。 参见 [C++20 常量表达式规则](https://timsong-cpp.github.io/cppwp/n4868/expr.const)。

Carven 将这一步纳入常量初始化：计算中的 String 最终冻结为 str。C++ 项目也可以把 freeze 封装进静态字符串库；这份对照把封装内部需要完成的工作展开了，不代表唯一写法。

把两边的 About 改成 Getting started，并更新断言。结果长度改变，Carven 的源码仍只需关心文本内容；C++ 的 freeze 模板会重新确定数组长度。这个例子展示的是构造与存储的分工，不是运行速度比较。

## 在编译期传递区间

控制流一章中的区间也是可在编译期使用的值。sum 接收区间，const 初始化决定这次调用在编译期执行。

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

fn main() {
    println(total);
}
```

程序输出 `10`。`..` 与 `..=` 的端点规则在编译期和运行时相同；区间模式也可用于 const fn 中的整数分类。

## 静态表格

```carven
const table: [i32] = [2, 4, 6];
const middle = table.slice(1usize, 3usize);

fn main() {
    println(middle.len(), middle[0]);
}
```

输出 `2 4`。这是具有静态 backing 的冻结切片，可以返回与长期保存。普通运行时局部数组的 view 不具有这个生命周期。const fn 内切片操作仍不在支持子集中，数组结果可以到常量初始化边界再冻结。

## 检查失败和预算

const test 始终在语义分析时执行，不需要测试产物选项。check 失败使编译失败，但继续当前测试；require/fail 停止当前测试，后续静态测试继续。普通 test 则交给运行时 runner。

常量执行只支持明确的子集，没有原生调用、typed failure、浮点计算、callable 或 Write 参数。所有分支都先检查准入，不能用 `if false` 隐藏不支持操作。整数溢出和预算耗尽是诊断，不回退到运行时。

## 练习

把静态断言改成错误文本，确认 compile 阶段失败。再恢复并运行 `compile --stdout`：编译期输出会写到 stderr，stdout 只包含生成产物。
