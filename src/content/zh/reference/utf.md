---
title: "UTF-8 与文本处理"
description: "Unicode 标量、UTF-8 校验、独立字符串、分割与借用游标。"
section: reference
lesson: 21
source: docs/language/utf.md
---

当字节输入需要变成有效文本，或文本需要分割、截取时，使用 `std::utf`。UTF-8 用一到四个字节表示一个 Unicode 标量，因此字节偏移不等于标量数；一个可见字符还可能由多个标量组成。各 API 会说明结果是独立 `String`，还是仍借用输入的视图。

## 公开文本类型

显式使用以下类型名时，从 `std::utf` 导入。结构体字段均公开。`UTF8ErrorKind` 和 `TextError` 是底层类型默认为 `i32` 的数值枚举；`UTF8DecodeResult` 和 `TextSplitField` 是载荷枚举。

| 类型                 | 字段或分支                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| `UnicodeScalarError` | `value: u32`                                                                                    |
| `UTF8Error`          | `kind: UTF8ErrorKind`、`offset: usize`、`sequence_start: usize`                                 |
| `UTF8ErrorKind`      | 无载荷的 `InvalidLead`、`InvalidContinuation`、`Overlong`、`Surrogate`、`TooLarge`、`Truncated` |
| `UTF8Encoded`        | `bytes: [u8; 4]`、`width: usize`                                                                |
| `UTF8DecodeResult`   | `End`、`Scalar(char, usize)`；后者携带标量及其编码字节数                                        |
| `TextError`          | 无载荷的 `OutOfBounds`、`NotCharBoundary`、`EmptySeparator`                                     |
| `TextSplit`          | `found: bool`、`before: str`、`after: str`                                                      |
| `TextSplitField`     | `Value(str)`、`End`                                                                             |

`UTF8Validator` 和 `TextSplitCursor` 是内部状态私有的源码类，构造与方法见下文。

## 编码、解码与校验

从 `std::utf` 导入类型和函数。`char::from_u32(value)` 与 `str::from_utf8(bytes)` 分别选择该模块的 `char_from_u32` 和 `from_utf8` 源码声明。关联形式必须直接调用；需要取得可调用值时，使用从该模块导入的函数名。

`char_from_u32` 拒绝代理项及大于 U+10FFFF 的值，抛出 `UnicodeScalarError { value }`。`from_utf8` 校验完整字节切片，再借用原存储；空输入有效，借用期间底层存储必须存活且保持有效。

| 操作                                                                  | 结果                                                              |
| --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `char_from_u32(value: u32) -> char throw UnicodeScalarError`          | 检查标量，与 `char::from_u32` 选择相同声明                        |
| `from_utf8(bytes: [u8]) -> str throw UTF8Error`                       | 检查后借用原存储，与 `str::from_utf8` 选择相同声明                |
| `validate_utf8(bytes: [u8]) -> void throw UTF8Error`                  | 无分配地校验完整输入                                              |
| `to_string(bytes: [u8]) -> String throw UTF8Error`                    | 校验后复制到独立拥有存储                                          |
| `decode_utf8_prefix(bytes: [u8]) -> UTF8DecodeResult throw UTF8Error` | 空输入为 `.End`；否则为首个 `.Scalar(char, usize)` 及其编码字节数 |
| `encode_utf8(character: char) -> UTF8Encoded`                         | 返回四字节数组 `bytes` 与实际编码长度 `width`                     |
| `encoded_bytes(encoded: UTF8Encoded) -> [u8]`                         | 只借用有效编码前缀                                                |
| `UTF8Validator::new() -> UTF8Validator`                               | 新建增量校验状态                                                  |
| `state.push(byte: u8) -> void throw UTF8Error`                        | 接受一个字节                                                      |
| `state.feed(bytes: [u8]) -> void throw UTF8Error`                     | 接受一个块；块末尾不代表 EOF                                      |
| `state.check_complete() -> void throw UTF8Error`                      | 检查是否完整，不结束该流                                          |

上表的 `state` 由 `UTF8Validator::new()` 创建。`push` 和 `feed` 需要 Write，`check_complete` 使用 Read。另外两个 Read 查询是 `state.processed_bytes() -> usize` 和 `state.is_complete() -> bool`，均没有类型化失败。

数组实参可隐式转为字节视图；文本通过 `.bytes` 提供字节切片。调用者能保证存储生命周期且无需复制时，使用 `str::from_utf8`。

```carven run
import std::utf using { to_string, UTF8Error }

fn main() throw UTF8Error {
    let bytes: [u8; 4] = [0xf0, 0x9f, 0x98, 0x80];
    let text = to_string(bytes)?;
    println(text); // 😀
}
```

## 文本处理

以下操作都是 `const fn`，也能在运行时执行；使用普通 `str`、`String`、切片和类型化失败。

| 操作                                                                    | 结果与所有权                                                     |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `substring(text: str, start: usize, end: usize) -> str throw TextError` | 借用半开 UTF-8 字节区间；两端必须是标量边界                      |
| `starts_with(text: str, prefix: str) -> bool`                           | 无分配地比较前缀                                                 |
| `ends_with(text: str, suffix: str) -> bool`                             | 精确比较后缀字节，空后缀始终匹配                                 |
| `split_once(text: str, separator: str) -> TextSplit throw TextError`    | 借用 `before` 与 `after`；`found` 区分找到分隔符与未找到         |
| `split(text: str, separator: str) -> Vector<String> throw TextError`    | 返回独立保存各字段文本的 String 集合，保留开头、相邻及末尾空字段 |
| `lines(text: str) -> Vector<String>`                                    | 按 LF 或 CRLF 分行，保留空行；末尾分隔符不增加一行               |

子串偏移计 UTF-8 字节，不是 Unicode 标量或字素簇。逆序或越界报告 `OutOfBounds`，位于标量内部报告 `NotCharBoundary`。分割使用精确且非空的 UTF-8 分隔符；空分隔符报告 `EmptySeparator`，不做空白规范化。未找到时 `found` 为 false，`before` 为完整输入，`after` 为空。

`TextSplit` 与子串借用原输入，包括经辅助函数返回的结果。`split` 与 `lines` 复制字段，可独立于输入保留。空文本产生一个空分割字段、零行；单独 CR 是内容，只移除 LF 前的 CR。

```carven
import std::utf using { split_once, TextError }

fn setting(text: str) -> String throw TextError {
    let pair = split_once(text, "=")?;
    return if pair.found { pair.after as String } else { "" };
}
```

## 静态执行

本页源码函数和方法均为 `const fn`，遵循[常量结果与预算规则](/zh/reference/constants/)。编码数组可以提供保留为常量的切片：

```carven
import std::utf using { encode_utf8, encoded_bytes, validate_utf8 }

const encoded = encode_utf8('😀');
const bytes = encoded_bytes(encoded);

const { validate_utf8(bytes)?; }
```

`encode_utf8` 返回的 `UTF8Encoded.bytes` 含四个字节，只有前 `width` 字节属于编码，其余为零。字段公开，因此手动构造后调用 `encoded_bytes` 时也必须满足 `1 <= width <= 4`；违反时，运行时终止，静态执行失败。`encoded_bytes` 检查这个长度，不校验 UTF-8 内容。先绑定编码结果，再保留 `encoded_bytes` 的视图；底层存储的生命周期与冲突修改仍接受普通检查。

## 失败位置与流协议

`UTF8Error` 含 `kind`、`offset`、`sequence_start`，位置是逻辑流中从零开始的字节偏移。`offset` 指向被拒绝字节，截断则指向输入末尾；`sequence_start` 指向该无效序列起点。它前面的字节形成有效前缀。

C0/C1 与 F5..FF 报告 `InvalidLead`。空输入、内嵌 NUL 与 Unicode 非字符均有效；不规范化、不做替换解码。前缀解码不会检查首个完整标量之后的字节。

`push` 失败时不改变状态；`feed` 失败时，保留出错前已接受字节的进度。出错后应结束这次校验；如果改用其他字节重试，校验的就是另一个字节流。块边界不代表 EOF；不完整块可接受，只在 `check_complete` 时报告截断。总长度必须可由 `usize` 表示。

校验器副本独立。用 `new` 初始化，`push` 或 `feed` 修改，它不持有输入。`processed_bytes()` 返回接受字节数；`is_complete()` 检查是否有未完成标量。两者和 `check_complete()` 使用 Read，检查不消耗或关闭校验器，之后仍可继续输入。

## 借用分割游标

| 调用                                     | 访问与结果                                                          |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `TextSplitCursor::new()`                 | 新 `TextSplitCursor`，无类型化失败                                  |
| `cursor.next(text: str, separator: str)` | Write 游标；返回借用 `text` 的 `TextSplitField`，可抛出 `TextError` |

`TextSplitCursor::new()` 创建只保存偏移的游标。显式调用 `cursor.next(text, separator)?`；`TextSplitField::Value(str)` 借用输入，`TextSplitField::End` 标记结束。空输入产生一个空字段，开头、相邻和末尾空字段均保留。支持多字节分隔符；即便游标已经结束，空分隔符仍报告 `EmptySeparator`。

一次遍历保持同一文本和分隔符。游标不持有文本，也不能识别输入是否被替换；返回字段需要原始底层存储存活且有效。游标副本从相同偏移独立遍历，游标与方法均支持静态执行。
