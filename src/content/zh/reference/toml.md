---
title: "TOML 配置"
description: "将 TOML 解析为拥有型值，并借用遍历表和数组。"
section: reference
lesson: 36
source: docs/language/toml.md
---

`std::toml` 解析配置并提供拥有型值及借用遍历。解析器用 Carven 编写，通过 `std::simd.scan` 扫描字节段，支持常量求值、解释和原生执行。

## 解析

```carven
import std::toml using { TOMLValue, TOMLError, TOMLValueError }

fn project_name(text: str) -> String throw TOMLError + TOMLValueError {
    let document = TOMLValue::parse(text)?;
    let project = document.get("project")?;
    return project.get("name")?.as_str()? as String;
}
```

`TOMLValue::parse(text: str)` 返回独立的 `TOMLValue` 树，根为表，空文档得到空表。`validate(text)` 检查相同语法但不保留树，两者均为 `const fn`。

`parse_bytes(bytes: [u8])` 和 `validate_bytes(bytes)` 先检查整个输入的 UTF-8，编码无效时先抛 `UTF8Error`；文本入口抛 `TOMLError`。解析器实现 TOML 1.0，包括注释、引号和点分键、基本和字面字符串、多行字符串、整数、浮点、布尔、日期时间、数组、内联表、表和表数组。多行字符串的 CRLF 与 LF 均规范为 LF。拒绝重复键、冲突表定义以及对已关闭内联表的扩展。

`project`、`version`、`dependencies` 等项目字段没有特殊意义。本模块不访问文件，也不解析依赖。

## 读取值

`kind()` 返回 `TOMLValueKind`：`String`、`Integer`、`Float`、`Boolean`、`OffsetDateTime`、`LocalDateTime`、`LocalDate`、`LocalTime`、`Array` 或 `Table`。

| 操作                     | 结果                                         |
| ------------------------ | -------------------------------------------- |
| `as_str()`               | 解码字符串的借用视图                         |
| `as_i64()`               | 有符号 64 位整数，包括十六、八、二进制输入   |
| `as_f64()`               | 浮点值，包括显式 `inf` 与 `nan`              |
| `as_bool()`              | 布尔值                                       |
| `date_time_text()`       | 保留小数精度和时区偏移的原日期时间拼写       |
| `length()`               | 表成员数或数组元素数                         |
| `elements()`             | 借用数组 `[TOMLValue]`                       |
| `members()`              | 插入顺序的借用表成员 `[(String, TOMLValue)]` |
| `get(key)` / `at(index)` | 独立的子值                                   |
| `has(key)`               | 表是否含有精确解码后的键                     |

查询均为 `const fn`。除 `kind` 外，种类不兼容抛 `TOMLValueError::WrongKind`，缺失键为 `MissingKey`，越界为 `IndexOutOfBounds`。数值查询要求对应的值种类；键按字面内容解释，点分路径通过连续 `get` 遍历。表数组使用普通数组与表查询。

值拥有完整树，可超过输入文本的生命周期。`elements` 和 `members` 不复制子树，按普通索引和遍历借用存储：

```carven
let document = TOMLValue::parse("name='hello'\nversions=[1, 2]")?;
for (key, value) in document.members()? {
    if key == "versions" {
        for version in value.elements()? {
            println(version.as_i64()?);
        }
    }
}
```

使用文本或集合视图时，所有者必须存活，不能替换或转移。把子值保存为拥有型 `TOMLValue`，包括调用 `get`、`at`，会复制该子树。需要独立文本时用 `as String`。API 提供解析和查询，不改写或序列化 TOML。

## 失败与限制

`TOMLError` 含 `kind` 与原输入中从零开始的 UTF-8 字节 `offset`，输入未完成时可指向 EOF。种类区分意外输入、无效键、转义、Unicode、控制字符、数值、日期时间、重复键、表重定义和深度限制。整数溢出视为无效数值，表路径和嵌套值的最大深度为 64。
