---
title: "JSON 值与序列化"
description: "解析、构造、修改和保存 JSON 值树，按类型处理失败。"
section: reference
lesson: 30
source: docs/language/json.md
---

用 `Value::parse` 把 JSON 文本解析为可查询和修改的值树，用 `to_json` 再写回 `String`。值树独立拥有字符串和子值，原始输入释放后仍然有效。

## 公开类型

下列名字均来自 `std::json`。`Value` 是自行管理存储的类，其字段私有；其他类型使用普通源码声明。`JSONErrorKind` 与 `ValueError` 是默认以 `i32` 为底层类型的数值枚举，按表中顺序从零开始依次编号。

| 类型            | 公开数据或分支                                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ValueKind: u8` | `Null = 0`、`Boolean = 1`、`Number = 2`、`String = 3`、`Array = 4`、`Object = 5`                                                                                   |
| `JSONError`     | `kind: JSONErrorKind`、`offset: usize`                                                                                                                             |
| `JSONErrorKind` | 无载荷的 `UnexpectedEnd`、`UnexpectedByte`、`InvalidEscape`、`InvalidHex`、`UnpairedSurrogate`、`ControlCharacter`、`InvalidNumber`、`TrailingInput`、`DepthLimit` |
| `ValueError`    | 无载荷的 `WrongKind`、`MissingKey`、`IndexOutOfBounds`、`NumberConversion`、`DepthLimit`                                                                           |

## 解析与写出

从 `std::json` 导入值类型、失败类型和函数。

| 操作                                       | 结果                         | 失败                     |
| ------------------------------------------ | ---------------------------- | ------------------------ |
| `Value::parse(text: str) -> Value`         | 独立拥有的值树               | `JSONError`              |
| `Value::parse_bytes(bytes: [u8]) -> Value` | 先校验 UTF-8，再生成独立树   | `UTF8Error`、`JSONError` |
| `value.to_json() -> String`                | 独立拥有的紧凑 JSON `String` | `ValueError`             |

`parse` 与 `parse_bytes` 是关联函数，`to_json` 使用 Read 接收者。根可以是任意 JSON 值。字节解析先检查完整输入的 UTF-8，所以编码错误优先于 JSON 语法错误。

```carven
import std::json using { Value, JSONError, ValueError };

fn update(text: str) -> String throw JSONError + ValueError {
    var config = Value::parse(text)?;
    config.set("enabled", &&Value::boolean(true))?;
    config.set("attempts", &&Value::integer(3))?;
    return config.to_json()?;
}
```

## 值与集合

以下工厂均返回 `Value`。

| 工厂                                                                | 输入与失败                                        |
| ------------------------------------------------------------------- | ------------------------------------------------- |
| `Value::null()`、`Value::array()`、`Value::object()`                | 对应种类的空值                                    |
| `Value::boolean(value: bool)`、`Value::string(text: str)`           | 保存布尔值或独立文本副本                          |
| `Value::number(text: str)`                                          | 恰好一个 JSON 数字的文本表示；失败为 `JSONError`  |
| `Value::integer(value: i64)`、`Value::unsigned_integer(value: u64)` | 精确整数                                          |
| `Value::real(value: f64)`                                           | 有限浮点值；否则为 `ValueError::NumberConversion` |

### Value 查询

| Read 方法             | 结果                     | 失败                                          |
| --------------------- | ------------------------ | --------------------------------------------- |
| `value.kind()`        | `ValueKind`              | 无                                            |
| `value.as_bool()`     | `bool`                   | `ValueError::WrongKind`                       |
| `value.as_str()`      | 借用 `str`               | `ValueError::WrongKind`                       |
| `value.number_text()` | 借用数字原始文本的 `str` | `ValueError::WrongKind`                       |
| `value.as_i64()`      | `i64`                    | `ValueError::WrongKind` 或 `NumberConversion` |
| `value.as_u64()`      | `u64`                    | `ValueError::WrongKind` 或 `NumberConversion` |
| `value.as_f64()`      | `f64`                    | `ValueError::WrongKind` 或 `NumberConversion` |

集合访问与修改方法见下表。

### 数组与对象方法

下表方法均可抛出 `ValueError`。`push`、`set_at`、`remove_at`、`set`、`append_member`、`erase` 需要 Write 接收者，其他方法使用 Read。`set` 和 `append_member` 保存的键独立拥有文本。

| 操作                                                                                                                                | 结果                         |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `value.length() -> usize`                                                                                                           | 数组元素数或对象成员数       |
| `value.at(index: usize) -> Value`、`value.get(key: str) -> Value`                                                                   | 独立子值                     |
| `value.push(&&child: Value) -> void`、`value.set_at(index: usize, &&child: Value) -> void`、`value.remove_at(index: usize) -> void` | 追加、替换或移除数组元素     |
| `value.has(key: str) -> bool`                                                                                                       | 是否含键                     |
| `value.set(key: str, &&child: Value) -> void`、`value.append_member(key: str, &&child: Value) -> void`                              | 替换或追加对象成员           |
| `value.erase(key: str) -> usize`                                                                                                    | 移除全部同名成员，返回数量   |
| `value.key_at(index: usize) -> str`、`value.member_value_at(index: usize) -> Value`                                                 | 按成员位置借用键或返回独立值 |

`length` 接受数组或对象；`at`、`push`、`set_at`、`remove_at` 要求数组；`has`、`get`、`set`、`append_member`、`erase`、`key_at`、`member_value_at` 要求对象。种类不匹配时报 `WrongKind`。带索引的方法在 `index >= length()` 时报告 `IndexOutOfBounds`。键不存在时，`get` 报 `MissingKey`，`has` 返回 false，`erase` 返回零。`remove_at` 销毁被移除的子值，返回 `void`。

对象保留成员顺序和重复键。`get` 取最后一个匹配成员，`set` 替换最后一个或追加，`erase` 移除所有匹配。子值访问返回独立副本；修改子值后，需要再赋回父对象。

`as_str`、`number_text` 和 `key_at` 返回借用 `str`。使用期间值须存活且保持有效，冲突修改与借用逃逸会被拒绝。需要独立生命周期时用 `as String`。保留子值视图前，先将 `get` 或 `at` 的结果绑定到名字：

```carven
let child = config.get("name")?;
let name = child.as_str()?;
let saved = name as String;
```

此片段接续一个含 `name` 字段的 `config`；它演示子值所有者和借用的关系。

## 数字

数字保留经过校验的原始文本表示。读写保留 `1E400` 等大数量级、整数精度、负零和指数拼写，不做排序或数值规范化。`as_i64()` 要求输入采用整数写法，且数值在结果类型范围内；`as_u64()` 还要求非负。`as_f64()` 允许舍入，拒绝越界。`number_text()` 返回原始文本；数值转换必须使用完整文本。

数值转换失败为不带输入偏移的 `ValueError::NumberConversion`。

## 校验与失败

| 函数                                  | 结果与失败                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| `validate(text: str) -> void`         | 校验一个完整 JSON 值；失败为 `JSONError`                                          |
| `validate_bytes(bytes: [u8]) -> void` | 先 UTF-8 后 JSON；失败为 `UTF8Error` 或 `JSONError`                               |
| `decode_string(text: str) -> String`  | 解码恰好一个带引号字符串，不接受外围空白；返回独立的 `String`，失败为 `JSONError` |

编码失败及其字节位置见 [UTF8Error](/zh/reference/utf/#失败位置与流协议)。

JSON 空白为普通空格、tab、LF、CR。代理项转义对合并为标量，未配对代理项被拒绝。输入与写出最多嵌套 64 层容器。写出转义引号、反斜线及控制字符，其余标量写为 UTF-8；保留成员顺序和数字拼写。

`JSONError.offset` 为输入字节偏移，`UnexpectedEnd` 指向输入长度，`UnpairedSurrogate` 指向相应反斜线。错误分支见[公开类型](#公开类型)。

## 静态执行

校验、解析、值构造、文本查询、修改、解码与写出均为 `const fn`，遵循普通预算、所有权与失败规则。导入 `Value` 后可以写：

```carven
const compact = Value::parse(r#"{ "enabled": true }"#)?.to_json()?;
```

完成初始化后，`String` 常量仍保留 String 类型和所有权。JSON 常量也保留嵌套字符串、数组、对象成员；复制后拥有独立可修改内容。
