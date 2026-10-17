---
title: 模块、声明与可见性
description: 源码批次、craft 域、导入解析、名字查找和接口可见性。
section: reference
lesson: 16
source: docs/language/modules.md
---

## 三种导入路径

import 用于在当前文件中使用另一个模块的声明。例如 `import std::json using Value;` 引入 JSON 值类型。导入放在其他声明之前，不执行被导入模块，也不自行在文件系统中寻找源码。

一次编译要用到哪些源文件，由命令行或构建系统预先提供。导入只在这些源模块和编译器提供的标准模块中解析。每个源文件有非空规范模块路径，组件形如 `[A-Za-z_][A-Za-z0-9_]*`，可使用关键字拼写。文件到路径的映射属于驱动策略。

`crafts.<name>.<path>` 属于 crafts.<name> 的模块域；须同时有 name 和非空 path。其他路径属于无前缀模块域，非首位 crafts 组件没有特殊含义。官方 craft 为 carven，`std::utf` 选择 `crafts.carven.std.utf`。

导入必须连续出现在模块开头：

| 引用           | 解析                      |
| -------------- | ------------------------- |
| `model.user`   | 当前模块域根              |
| `.value`       | 当前模块逻辑目录          |
| `json::parser` | 外部 craft json 的 parser |
| `std::utf`     | 官方标准模块              |

`.value` 在 a.b.main 中是 a.b.value，在 crafts.json.a.b.main 中是 crafts.json.a.b.value。无前缀和前导点不跨模块域，缺失目标或自导入非法。std::core 与 carven::std.core 是同一模块。

编译器提供的声明不要求相应源文件，源导出必须在批次里；标准入口可同时包含两类声明，冲突非法。目录前缀仅分组路径，不隐式导入子模块。C++ 头文件导入提供原生声明，独立于 Carven 模块解析。

## 标准模块与默认名字

| 模块         | 编译器提供的导出                                                                                               | 默认绑定               |
| ------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------- |
| std::core    | 标量、文本、void、Vector、Range、assert、addressof                                                             | 上述名字               |
| std::io      | print、println、eprint、eprintln                                                                               | 打印名字与源定义 stdin |
| std::testing | check、require、fail                                                                                           | 上述名字               |
| std::async   | Operation、cancel_requested、cancel_point、yield_once、wait_ready、close、when_all、when_any、first_successful | 无                     |
| std::simd    | u8x16、mask16、f32x4、mask4、u8x32、mask32、f32x8、mask8                                                       | 上述名字               |
| std::time    | timeout                                                                                                        | 无                     |

显式导入默认名字参与普通使用跟踪。测试助手需要活跃测试，assert 在测试外可用。stdin 默认绑定与显式 std::io 导入选择同一源声明；char::from_u32 与 str::from_utf8 也分别复用 std::utf 的 char_from_u32/from_utf8 声明。

导入函数不同时绑定其签名里的所有类型。可推断、使用并传播结果和失败而不命名类型；注解、构造或处理器里命名非默认类型须显式导入。Duration 字面量无需导入，命名 Duration 须从 std::time 导入；数值 parse 同理，命名 NumberParseError 须从 std::core 导入。

标准库条目见[库总览](/zh/reference/library/)、[异步](/zh/reference/async/)、[时间](/zh/reference/time/)、[输入输出](/zh/reference/io/)、[JSON](/zh/reference/json/)与[网络](/zh/reference/net/)。

## 库源文件组织

公开库入口是普通模块，导出其契约。能力可放一个 cv 文件，或把实现放进同名目录；每个文件保持独立身份与显式依赖。std/utf.cv 不会自动导出 std/utf/scan.cv 的内容。裸声明可在 craft 内共享，private 辅助限定到模块。using 只引入局部绑定，不重新导出，也不聚合子目录。

## 导入别名

```carven
import std::core using String as Text;
import std::async using { Operation, when_all as join };
import std::simd.bytes using load_block as load_bytes;
import std::simd.floats using load_block as load_floats;
```

as 前按目标模块可见性检查导出名，别名是该选择唯一引入的局部名；两者均须普通标识符。单项与列表规则相同，通配导入无别名。不同局部名可选同一实体，重复局部名非法。别名保留身份、类型、拥有权、失败和调用契约。默认绑定独立存在，`print as write` 不移除默认 print。导入顺序不改变解析或冲突。

## 声明与名字查找

函数、结构体、类、枚举与模块常量共享模块名字空间，不支持重载。裸声明必须使用普通标识符 token，关键字不能作声明名；只有 ptr 对模块声明、类型参数和导入局部名字额外保留。内建类型名可遮蔽。模块路径与限定/成员组件可接收标识符形关键字，using 选择仍要求普通标识符；没有转义标识符。

整个编译边界先识别各类型和函数的声明，再按依赖完成签名、常量和所需静态函数体。声明顺序不限制前向常量依赖或相互递归调用；必需常量依赖环非法。

表达式查找依次考虑词法绑定、模块声明与 Carven 导入、显式原生选择、默认标准名字、打开的 C++ 名字空间。模块声明压过通配候选，显式 Carven 导入压过通配但与模块声明冲突。多个通配候选仅在实际使用需要该名时歧义，即使选同一实体也歧义。选到错误种类不会因默认契约更适合而回退。

类型位置优先类型参数，忽略运行时局部与参数；表达式限定符优先词法绑定与类型参数。`fn f(String: i32) -> String` 的结果仍为默认 String，但参数阻止 `String::from_str`；可导入 String as Text 并用 Text::from_str。字面量后缀、推断类型和结构语法的规范意义不因名字遮蔽而变。

## 可见性

| 声明    | 受众               |
| ------- | ------------------ |
| private | 定义模块           |
| 裸声明  | 同一 craft/模块域  |
| export  | 编译边界内跨 craft |

可见性取决于定义 craft，不取决于导入拼写；std:: 属于 carven craft。普通应用模块共享无前缀域。声明在自身模块总可见。对外暴露的类型信息会递归检查参数、结果、失败、可调用值、字段、载荷、底层类型、数组及常量的归一化类型和值，不能把对使用者不可见的类型暴露出去；违反报告 CV-TYPE-VISIBILITY-LEAK。函数体与被归一化消除的内部身份不属于公开表面。类私有字段可用模块私有类型，类操作仍遵循声明受众。

## 批次与规范模块名

模块目录由调用者预先建立。import 不发现文件、不下载包、不添加链接库，也没有运行时副作用。未被导入的批次源文件仍接受检查。实际选择唯一绑定的引用才算导入使用，否则有 CV-LINT-UNUSED-IMPORT。同作用域重复名字非法，内层可遮蔽外层；lambda 自由运行时绑定须显式捕获。
