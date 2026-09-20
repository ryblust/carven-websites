---
title: 模块、声明与可见性
description: 源码批次、craft 域、导入解析、名字查找和接口可见性。
section: reference
lesson: 2
source: docs/semantics.md
---

## 编译批次与规范模块名

一次编译分析由驱动或构建集成在导入解析前确定的封闭源码批次。导入不会自动搜索磁盘或下载依赖。每个输入对应唯一规范模块名；路径分量符合 `[A-Za-z_][A-Za-z0-9_]*`，模块分量允许语言关键字。

```text
src/main.cv                  → src.main
crafts/json/parser.cv        → crafts.json.parser
crafts/carven/std/utf/text.cv → crafts.carven.std.utf.text
```

前导 `crafts.<name>.<path>` 定义一个 craft 域；`crafts` 和 `crafts.<name>` 本身不构成完整模块。普通应用模块属于无前缀域。非前导 `crafts` 是普通分量。官方 craft 名是 `carven`，`std::` 专门选择它的 `std` 子树。

## 三种导入路径

```carven
import model.user using User;
import .value using Value;
import json::parser using parse;
import std::utf.text using *;
```

| 引用            | 起点                             |
| --------------- | -------------------------------- |
| `model.user`    | 当前 craft 域根                  |
| `.value`        | 当前模块去掉最后分量后的逻辑目录 |
| `json::parser`  | `crafts.json`                    |
| `std::utf.text` | `crafts.carven.std`              |

在 `crafts.foo.models.user` 中，`.value` 指向 `crafts.foo.models.value`。无前缀和相对导入都留在当前域中。目标必须是批次中另一个模块；自导入、缺失模块和重复规范输入名都是错误。

导入路径选择模块，`using` 选择名字或引入名字环境。跨模块使用必须先显式导入。多个 wildcard 提供同名符号时，只有实际使用需要该名字才构成歧义。显式选择优先于同名 wildcard；它不能与本地声明冲突，也不能把同一个绑定名映射到不同符号。

导入没有运行时副作用。一个导入通过唯一解析的实际引用计为使用；未使用的导入产生 `CV-LINT-UNUSED-IMPORT`。C++ 头文件导入可以位于同一导入前缀，但不解析 Carven 模块。

## 声明与查找

函数、结构体、枚举和模块常量共享模块命名空间。同名模块声明非法，函数没有重载。模块还可包含测试、常量块、C++ 片段和入口语句。

声明身份在整个批次中收集，合法的前向函数调用、相互递归和常量依赖不受源码先后顺序限制。常量必需事实形成环会报错。

无前缀名字从最内层词法作用域查找，再到外围作用域、模块声明和导入。同一词法作用域内不能重复声明；内层可以遮蔽外层。局部名字在类型、初始化表达式及常量证明完成后才可见，所以初始化表达式可以引用同名外层绑定。

lambda 是捕获边界。外层运行时绑定必须显式捕获；模块声明和编译期常量可直接查找。

## 可见性

| 写法      | 可见范围                               |
| --------- | -------------------------------------- |
| `private` | 定义模块                               |
| 无修饰符  | 同一 craft 域的所有模块                |
| `export`  | 当前编译批次的所有模块，包括其他 craft |

每个声明在自身模块都可见。可见性由定义域决定，不因导入拼写变化。通过 `std::` 引入的模块仍属于 `carven` craft。普通应用模块可以互相选择裸声明。

一个声明的公开表面只能使用对其所有读者可见的名义类型。检查递归覆盖参数、返回值、失败集合、嵌套 callable、字段、枚举载荷及底层类型、数组、常量的类型和归一化值。函数体和常量计算中已经消去的身份不属于公开表面。泄漏不可见类型产生 `CV-TYPE-VISIBILITY-LEAK`。

```carven
private struct Hidden {}

// 编译错误：export 的读者看不到 Hidden。
export fn expose() -> Hidden {
    return Hidden {};
}
```

CLI 的 `check`、`compile`、原生运行和 `interpret` 将显式应用文件与工具链、项目的 Crafts 目录合并。收集发生在导入解析之前；目录、去重和已安装库的要求见[源码收集](/zh/reference/cli/#源码收集)。
