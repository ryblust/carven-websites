---
title: 调用 C++ 与导出接口
description: 从 printf 到 scalar façade，明确原生类型、异常与构建责任。
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

输出 4。原生类型参数可以是类型。构造、方法和转换由 C++ 判断，注解 usize 请求目标构造。原生索引遵守提供者规则，不自动获得 Carven 数组越界检查。

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

输出 42。cpp 片段原样进入实现，import(cpp) 让 Carven 调用同名全局提供者，export(cpp) 把包装函数放进模块的生成 API。C++ 消费者 include 生成 `carven/api/<模块名>.hpp`，使用 `carven::api` 下的模块 namespace。

这种显式边界只接受按值 Read 的内建 scalar 参数和 scalar/void 结果，不支持 String、数组、结构体、指针、Write/Take 或 typed failure。更广的头文件直接操作服从其原生契约。

## 异常和借用

生成函数具有 noexcept 边界，C++ 异常逃出会终止。Carven try 不捕获原生异常。需要恢复时，在原生适配函数中先 catch，再通过选定接口返回结果。

Carven 跟踪已知存储和文本 backing，但不证明任意 C++ 返回指针的存活，也不推断原生函数长期保留参数的行为。调用者与提供者共同满足这些契约。

## 练习

把 native_double 改成返回 value + 2，确认输出改变。再去掉 cpp 提供者，只保留 import(cpp)，观察原生声明/链接边界的失败。不要把它误认为 Carven 已验证了提供者存在。
