---
title: "JSON 值与序列化"
description: "解析、构造、修改与保留拥有型 JSON 树，处理精确的类型化失败。"
section: reference
lesson: 31
source: docs/language/json.md
---

用 Value::parse 把 JSON 文本解析为可查询和修改的值树，用 to_json 再写回 String。值树独立拥有字符串和子值，原始输入不再保留也不会使它失效。下面先查解析与写出，再查各类值的访问和修改。

## 解析与写出

从 `std::json` 导入值类型、失败类型和函数。

| 操作                              | 结果                         | 失败                     |
| --------------------------------- | ---------------------------- | ------------------------ |
| `Value::parse(text: str)`         | 独立拥有的值树               | `JSONError`              |
| `Value::parse_bytes(bytes: [u8])` | 先校验 UTF-8，再生成独立树   | `UTF8Error`、`JSONError` |
| `value.to_json()`                 | 独立拥有的紧凑 JSON `String` | `ValueError`             |

根可以是任意 JSON 值。字节解析先检查完整输入的 UTF-8，所以编码错误优先于 JSON 语法错误。

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

| 工厂                                                  | 输入与失败                                 |
| ----------------------------------------------------- | ------------------------------------------ |
| `null()`、`array()`、`object()`                       | 对应种类的空值                             |
| `boolean(value: bool)`、`string(text: str)`           | 保存布尔值或独立文本副本                   |
| `number(text: str)`                                   | 恰好一个 JSON 数字拼写；失败为 `JSONError` |
| `integer(value: i64)`、`unsigned_integer(value: u64)` | 精确整数                                   |
| `real(value: f64)`                                    | 有限浮点值；否则为 `ValueError`            |

`kind()` 返回 `ValueKind`，取值为 `Null`、`Boolean`、`Number`、`String`、`Array`、`Object`。`as_bool()`、`as_str()` 查询对应标量种类。种类不匹配时抛出 `ValueError`，集合还检查键和索引。修改方法需要 Write 接收者，`&&value` 将子值转移进容器。

| 操作                                                          | 结果                         |
| ------------------------------------------------------------- | ---------------------------- |
| `length()`                                                    | 数组元素数或对象成员数       |
| `at(index)`、`get(key)`                                       | 独立子值                     |
| `push(&&value)`、`set_at(index, &&value)`、`remove_at(index)` | 追加、替换或移除数组元素     |
| `has(key)`                                                    | 是否含键                     |
| `set(key, &&value)`、`append_member(key, &&value)`            | 替换或追加对象成员           |
| `erase(key)`                                                  | 移除全部同名成员，返回数量   |
| `key_at(index)`、`member_value_at(index)`                     | 按成员位置借用键或返回独立值 |

对象保留成员顺序和重复键。`get` 取最后一个匹配成员，`set` 替换最后一个或追加，`erase` 移除所有匹配。子值访问返回独立副本；修改子值后，需要再赋回父对象。

`as_str`、`number_text` 和 `key_at` 返回借用 `str`。使用期间值须存活且保持有效，冲突修改与借用逃逸会被拒绝。需要独立寿命时用 `as String`。保留子值视图前，先将 `get` 或 `at` 的结果绑定到名字：

```carven
let child = config.get("name")?;
let name = child.as_str()?;
let saved = name as String;
```

此片段接续一个含 `name` 字段的 `config`；它演示子值所有者和借用的关系。

## 数字

数字保存经过校验的原始拼写。读写保留 `1E400` 等大数量级、整数精度、负零和指数拼写，不做排序或数值规范化。`as_i64()` 要求整数拼写且范围可表示；`as_u64()` 还要求非负。`as_f64()` 允许舍入，拒绝越界。`number_text()` 返回原拼写；转换使用完整拼写。

数值转换失败为不带输入偏移的 `ValueError::NumberConversion`。

## 校验与失败

| 函数                          | 结果与失败                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `validate(text: str)`         | 校验一个完整 JSON 值；失败为 `JSONError`                                          |
| `validate_bytes(bytes: [u8])` | 先 UTF-8 后 JSON；失败为 `UTF8Error` 或 `JSONError`                               |
| `decode_string(text: str)`    | 解码恰好一个带引号字符串，不接受外围空白；返回拥有型 `String`，失败为 `JSONError` |

`UTF8Error` 保存种类、被拒绝字节偏移、序列起点，偏移从零计 UTF-8 字节；EOF 截断指向输入末尾。

JSON 空白为普通空格、tab、LF、CR。代理项转义对合并为标量，未配对代理项被拒绝。输入与写出最多嵌套 64 层容器。写出转义引号、反斜线及控制字符，其余标量写为 UTF-8；保留成员顺序和数字拼写。

`JSONError.offset` 为输入字节偏移，`UnexpectedEnd` 指向输入长度，`UnpairedSurrogate` 指向相应反斜线。`kind` 为 `UnexpectedEnd`、`UnexpectedByte`、`InvalidEscape`、`InvalidHex`、`UnpairedSurrogate`、`ControlCharacter`、`InvalidNumber`、`TrailingInput` 或 `DepthLimit`。

值操作的错误为 `ValueError::WrongKind`、`MissingKey`、`IndexOutOfBounds`、`NumberConversion`、`DepthLimit`。

## 静态执行

校验、解析、值构造、文本查询、修改、解码与写出均为 `const fn`，遵循普通预算、所有权与失败规则。导入 `Value` 后可以写：

```carven
const compact = Value::parse(r#"{ "enabled": true }"#)?.to_json()?;
```

完成的 `String` 保留拥有类型。JSON 常量也保留嵌套字符串、数组、对象成员；复制后拥有独立可修改内容。
