---
title: "调用 C++ 与导出接口"
description: 从 `printf` 到声明式函数契约，了解原生类型、异常与构建要求。
section: learn
lesson: 15
source: docs/language/interop.md
---

## 第一个原生调用

保存为 hello.cv：

```carven
import <cstdio> using std::printf;

let greeting = c"Hello from C++";
printf(c"%s\n", greeting);
println(greeting);
```

`carven run hello.cv` 输出两次 Hello from C++：一次来自 `printf`，一次来自 `println`。导入的头文件进入生成的 C++，`using` 在 Carven 中引入要调用的名字。c 字面量是尾随 NUL 的原生 `const char*`，不是 `str`；内部 NUL 被拒绝。`println` 和默认插值把 C 字符串的字节作为文本显示，而不是显示地址。

也可用 `::std::printf` 明确全局 C++ 路径。Carven 不读取头文件内容，C++ 编译器检查函数存在、重载和实参是否合法。`carven interpret` 接受导入了头文件的文件，但执行到 `printf` 这样的原生调用时会以 `CV-INTERPRET-ADMISSION` 停止；原生代码请用 `carven run` 运行。

## 构造与使用 C++ 类型

```carven
import <vector> using std::vector;

var values = vector { 1, 2, 3 };
values.push_back(4);
let count: usize = values.size();
println(count, values[3]);
```

输出 `4 4`。花括号构造交给 C++ 完成，包括类模板实参推导；`vector<i32> { 1, 2, 3 }` 则显式写出元素类型。C++ 检查构造、方法调用和转换是否合法；`usize` 注解要求用调用结果构造一个 `usize` 值。原生索引遵守提供者规则，不自动获得 Carven 数组越界检查。

## 选择标准 API 或 C++ 库

Carven 可增长数据使用数据章节的 `Vector<T>`，JSON 使用自己管理数据的 `std::json` API；两者都不需要第三方 C++ 依赖：

```carven run
import std::json using { JSONValue, JSONError, JSONValueError }

fn configure(text: str) -> String throw JSONError + JSONValueError {
    var config = JSONValue::parse(text)?;
    if !config.has("port")? => config.set("port", &&JSONValue::integer(8080))?;
    return config.to_json()?;
}

println(configure(r#"{"enabled":true}"#)?);
```

输出 `{"enabled":true,"port":8080}`。值操作见[JSON 参考](/zh/reference/json/)；处理输入记录的例子见[输入项目](/zh/learn/data-pipeline/)。

依赖提供所需原生能力或已有 C++ 类型时，使用头文件导入。头文件导入不安装库或配置链接。包含路径、版本、标志和链接库都放在原生构建里。调用者需要类型化恢复时，应在 provider 边界转换外部异常。

## 声明原生函数契约

这个例子导入一个私有的原生提供方，再选定一个 Carven 包装函数作为 C++ 可调用入口：

```carven
import <cstdint>;

#[cpp] ---
std::int32_t native_double(std::int32_t value) {
    return value * 2;
}
---

private import(cpp) fn native_double(value: i32) -> i32 = ::native_double;

export(cpp) fn doubled(value: i32) -> i32 => native_double(value);

println(doubled(21));
```

输出 42。`cpp` 片段原样进入实现。显式的 `= ::native_double` 把源码契约绑定到该全局 C++ 函数。不写显式目标时，导入会在生成的提供者命名空间中声明 `invoke`。

`export(cpp)` 只把选定的 `doubled` 入口放进模块生成的 C++ API，提供方绑定仍保持私有。它在 Carven 源码中的可见范围仍限于同一 Craft。C++ 调用方包含生成的 `carven/api/<模块名>.hpp` 头文件，使用 `carven::api` 下对应的模块命名空间。仅供 Carven 项目内部调用的包装函数则使用普通 `fn` 声明即可。

下一个例子把带可写参数和失败契约的 Carven 函数提供给 C++ 调用方，这个边界才使用 `export(cpp)`。签名类型仅用于生成的 C++ API 时，不需要普通 `export`。

## 导出修改和失败契约

将下面的独立例子保存为 labels.cv：

```carven
struct EmptyLabel {}

export(cpp) fn rename(&label: String, next: str) throw EmptyLabel {
    if next.is_empty() {
        throw EmptyLabel {};
    }
    label = next as String;
}
```

先把下面两条测试追加到同一文件，检查修改成功和拒绝空文本的行为：

```carven
test "rename a label" {
    var label: String = "before";

    try {
        rename(&label, "after")?;
    } catch {
        EmptyLabel(_) => fail("nonempty label was rejected"),
    }

    check(label == "after");
}

test "reject an empty label" {
    var label: String = "before";

    let rejected = try {
        rename(&label, "")?;
        false
    } catch {
        EmptyLabel(_) => true,
    };

    check(rejected);
    check(label == "before");
}
```

```sh
carven interpret --tests labels.cv
carven compile -o generated labels.cv
```

两条测试都应通过：成功时文本变为 after，失败时仍是 before。`carven interpret --tests labels.cv` 不调用 C++ 编译器也能运行同样的测试。打开 `generated/carven/api/labels.hpp` 查看生成的接口声明。Write 参数成为可变引用，声明的失败使用 `carven::runtime::Outcome`，头文件包含所需类型定义。

C++ 调用者包含这个 API。在 labels.cv 旁边保存 consumer.cpp：

```cpp
#include <carven/api/labels.hpp>

#include <iostream>

int main() {
    auto label = carven::runtime::String::from_str("before");
    auto renamed = carven::api::labels::rename(label, "after");
    auto rejected = carven::api::labels::rename(label, "");
    if (!renamed.success_if() || rejected.success_if()) {
        return 1;
    }

    std::cout << label.as_str() << '\n';
}
```

把调用者与 generated/labels.cpp 一起编译。这个例子只需头文件中的运行时支持，无须加入其他生成的标准库实现：

```sh
clang++ -std=c++20 -Igenerated -I/path/to/carven/crafts \
    consumer.cpp generated/labels.cpp -o consumer
./consumer
```

把 `/path/to/carven/crafts` 换成安装的 Crafts 目录，运行时头文件由它提供。程序输出 `after`：第一次调用成功，被拒绝的调用没有改动文本。`success_if()` 在成功时返回指针，失败时返回空指针；EmptyLabel 是这个函数唯一声明的失败类型。结果不符合预期时，程序返回非零退出状态。

调用者需要处理成功或 EmptyLabel 结果。这里的失败是显式返回契约，C++ 异常不会自动转换成它。完整类型映射和生命周期责任见[互操作参考](/zh/reference/interop/)。

## 异常和借用

Carven try 不捕获 C++ 异常。调用者需要类型化恢复时，应在原生适配函数中转换异常，下一个例子会演示。

调用者与 provider 必须保证 C++ 返回或保留的指针仍然有效。生命周期责任见[互操作参考](/zh/reference/interop/)。

## 把原生异常转换为声明的失败

原生适配函数也可以先捕获异常，再返回声明的失败。保存 `port.cv`：

```carven
import <cstdint>;
import <stdexcept>;
import <string>;
import <string_view>;

struct InvalidPort {}

#[cpp] ---
#include <carven/runtime/value/outcome.hpp>

template<typename Failure>
auto parse_port_native(std::string_view text, const Failure& invalid) noexcept
    -> carven::runtime::Outcome<std::int32_t, Failure> {
    using Result = carven::runtime::Outcome<std::int32_t, Failure>;

    try {
        std::size_t used = 0;
        const int port = std::stoi(std::string{text}, &used);
        if (used != text.size() || port < 1 || port > 65535) {
            return Result::failure(invalid);
        }

        return Result::success_from([port]() noexcept -> std::int32_t { return port; });
    } catch (const std::invalid_argument&) {
        return Result::failure(invalid);
    } catch (const std::out_of_range&) {
        return Result::failure(invalid);
    }
}
---

import(cpp) fn parse_port_native(text: str, invalid: InvalidPort) -> i32 throw InvalidPort = ::parse_port_native;

fn port(text: str) -> i32 throw InvalidPort => parse_port_native(text, {})?;

fn report(text: str) {
    try {
        println("Port:", port(text)?);
    } catch {
        InvalidPort(_) => println("Invalid port:", text),
    }
}

report("8080");
report("http");
report("99999999999999999999");
report("80suffix");
```

`carven run port.cv` 输出：

```text
Port: 8080
Invalid port: http
Invalid port: 99999999999999999999
Invalid port: 80suffix
```

在 `parse_port_native(text, {})` 中，参数类型为 `{}` 提供了类型，因此调用传入一个空的 `InvalidPort`。C++ 模板从这个实参推导生成的失败类型，无需写出编译器内部的命名空间。哪些异常转换为 `InvalidPort` 由适配函数决定；它没有捕获的异常（例如内存分配失败）仍会在 noexcept 边界终止程序。随后 Carven 的 `?` 与 catch 按声明的契约工作。

## 练习

回到 `native_double` 示例，把函数体改为返回 value + 2，再次运行，应输出 `23`。再去掉 cpp 提供者，只保留 import(cpp)，观察原生声明/链接边界的失败。提供者是否存在由原生编译和链接检查。
