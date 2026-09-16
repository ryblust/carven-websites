---
title: "调用 C++ 与导出接口"
description: 从 printf 到标量接口，了解原生类型、异常与构建要求。
section: learn
lesson: 13
source: docs/semantics.md
---

## 第一个原生调用

```carven
import <cstdio> using std::printf;

fn main() {
    printf(c"Hello from C++\n");
}
```

原生运行输出 Hello from C++。头导入提供 C++ 声明，using 让名字可查找。c 字面量是尾随 NUL 的原生 const char*，不是 str；内部 NUL 被拒绝。

也可用 `::std::printf` 明确全局 C++ 路径。Carven 不读取头文件内容，C++ 编译器检查函数存在、重载和实参是否合法。

## 原生类型

```carven
import <vector> using std::vector;

fn main() {
    var values = vector<i32> { 1, 2, 3 };
    values.push_back(4);
    let count: usize = values.size();
    println(count);
}
```

输出 4。原生模板可以接收类型实参。C++ 检查构造、方法调用和转换是否合法；usize 注解要求用调用结果构造一个 usize 值。原生索引遵守提供者规则，不自动获得 Carven 数组越界检查。

## 使用第三方库

同样的导入方式也适用于 [nlohmann/json](https://json.nlohmann.me/integration/)。将下面的代码保存为 config.cv：

```carven
import <nlohmann/json.hpp> using nlohmann::json::parse;

fn main() {
    let config = parse(c"{\"port\":9000}");
    let port: i32 = config.value(c"port", 8080);
    println(f"Port: {port}");
}
```

parse 创建库提供的原生 JSON 对象；它的 value 方法读取 port，键不存在时使用 8080。i32 标注为原生结果指定 Carven 目标类型，随后就能用 println 输出。这些调用无需另写绑定代码。

本地试运行时，将单头文件放在 config.cv 旁边的 nlohmann/ 目录中。下面固定使用验证过的版本：

```sh
mkdir -p nlohmann
curl --fail --location https://raw.githubusercontent.com/nlohmann/json/v3.12.0/single_include/nlohmann/json.hpp -o nlohmann/json.hpp
carven config.cv
```

输出应为 `Port: 9000`。把 JSON 文本改成 `{}` 再运行，输出变为 `Port: 8080`。接入已有项目时，继续通过原生构建系统管理依赖与包含路径；导入头文件不会自动下载库。

[value 的默认值](https://json.nlohmann.me/api/basic_json/value/)只处理键缺失，不处理 JSON 格式错误或值类型不符。这个例子假定输入是合法对象，port 存在时为范围内的整数。解析和类型错误可能抛出原生异常；处理外部输入前，请先阅读下面的异常边界说明。

## 显式 scalar 接口

```carven
import <cstdint>;

#[cpp] ---
std::int32_t native_double(std::int32_t value) {
    return value * 2;
}
---

private import(cpp) fn native_double(value: i32) -> i32;

export(cpp) fn doubled(value: i32) -> i32 => native_double(value);

fn main() {
    println(doubled(21));
}
```

输出 42。cpp 片段原样进入实现，import(cpp) 让 Carven 调用同名全局提供者，export(cpp) 把包装函数放进模块的生成 API。C++ 调用方包含生成的 `carven/api/<模块名>.hpp` 头文件，使用 `carven::api` 下对应的模块命名空间。

这种显式接口只接受按值 Read 的内建标量参数，返回标量或 void；不支持 String、数组、结构体、指针、Write/Take 或类型化失败。通过头文件直接使用其他原生操作时，须遵守对应的 C++ 契约。

## 异常和借用

生成函数具有 noexcept 边界，C++ 异常逃出会终止。Carven try 不捕获原生异常。需要恢复时，在原生适配函数中先 catch，再通过选定接口返回结果。

Carven 跟踪已知存储和文本的底层存储，但不证明任意 C++ 返回指针所指对象是否存活，也不推断原生函数是否长期保留参数。这些要求由调用者与提供者共同保证。

## 练习

把 native_double 改成返回 value + 2，确认输出改变。再去掉 cpp 提供者，只保留 import(cpp)，观察原生声明/链接边界的失败。提供者是否存在由原生编译和链接检查。
