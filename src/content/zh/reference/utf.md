---
title: UTF 标准库
description: 标量转换、UTF-8 编解码、拥有与借用文本、增量验证。
section: reference
lesson: 17
source: crafts/carven/std/utf/README.md
---

## 模块与接口

`carven`、`check`、`compile` 和 `interpret` 命令会自动收集官方库源码。使用 `import std::utf.text using to_string;` 等选择具体能力。

| 模块                | 内容                                          |
| ------------------- | --------------------------------------------- |
| std::utf.scalar     | UnicodeScalarError、标量转换                  |
| std::utf.codec      | UTF8Encoded、UTF8DecodeResult、前缀解码和编码 |
| std::utf.validation | UTF8Validator、整缓冲区验证                   |
| std::utf.error      | 共享 UTF8ErrorKind、UTF8Error                 |
| std::utf.text       | 借用与拥有文本构造                            |

| 操作                                                                  | 结果                                         |
| --------------------------------------------------------------------- | -------------------------------------------- |
| `validate_utf8(bytes: [u8]) throw UTF8Error`                          | 无分配检查整个输入                           |
| `from_utf8(bytes: [u8]) -> str throw UTF8Error`                       | 验证后借用相同存储                           |
| `to_string(bytes: [u8]) -> String throw UTF8Error`                    | 验证后独立复制                               |
| `decode_utf8_prefix(bytes: [u8]) -> UTF8DecodeResult throw UTF8Error` | 空输入 End，否则首个 Scalar(`char`, `usize`) |
| `encode_utf8(character: char) -> UTF8Encoded`                         | 四字节数组 bytes 与有效 width                |
| `char_from_u32(value: u32) -> char throw UnicodeScalarError`          | 检查标量范围                                 |
| `character as u32`                                                    | 标量编号                                     |
| `UTF8Validator::create() -> UTF8Validator`                            | 新验证状态                                   |
| `state.push(byte: u8) throw UTF8Error`                                | 接受一个字节                                 |
| `state.feed(bytes: [u8]) throw UTF8Error`                             | 接受一个块；块末尾不是 EOF                   |
| `state.check_complete() throw UTF8Error`                              | 检查完整性，不结束流                         |
| `state.processed_bytes() -> usize`                                    | 已接受的字节数                               |
| `state.is_complete() -> bool`                                         | 是否没有未完成的标量                         |

数组可隐式转字节切片，也可显式 as_slice；文本 `.bytes` 提供切片。from_utf8 的结果借用输入，必须保持 backing 存活且不变；to_string 的结果独立，可从局部数组安全返回。

```carven
import std::utf.text using to_string;
import std::utf.error using UTF8Error;

fn text() -> String throw UTF8Error {
    let bytes: [u8; 4] = [0xf0, 0x9f, 0x98, 0x80];
    return to_string(bytes)?;
}
```

## 编译期使用

`char_from_u32`、`encode_utf8`、`decode_utf8_prefix`、`validate_utf8` 都是 const fn。同一 Carven 实现在编译期和普通运行时调用中执行，编码数组也可成为冻结常量切片。

```carven
import std::utf.codec using { encode_utf8, decode_utf8_prefix, UTF8DecodeResult };
import std::utf.validation using validate_utf8;

const encoded = encode_utf8('😀');
const bytes: [u8] = encoded.bytes;
const {
    validate_utf8(bytes.slice(0, encoded.width))?;
    assert(encoded.width == 4);
}
const decoded = decode_utf8_prefix(bytes.slice(0, encoded.width))?;
const test "UTF round trip" {
    match decoded {
        .Scalar(value, width) => {
            check(value == '😀');
            check(width == 4);
        },
        .End => fail("missing scalar"),
    }
}
```

UTF8Encoded.bytes 始终有四个字节，只有前 width 字节属于编码，其余补零。创建字节视图时要保留 width，否则填充会引入额外 NUL 标量。静态调用遵循普通带类型失败契约和执行预算。

`from_utf8`、`to_string` 需要运行时执行，因为执行器不允许未检查借用文本构造。`UTF8Validator` 也只能在运行时使用，因为类值不在静态执行范围内。整缓冲区验证使用内部结构体状态。原生 UTF 验证与 SIMD craft 共享所选后端，见 [SIMD 要求](/zh/reference/simd/#类型与后端)。

## 错误位置

UTF8Error 包含 kind、offset、sequence_start。偏移均是逻辑流中的零基字节位置。offset 指向拒绝字节，EOF 截断时指向末尾；sequence_start 指向非法序列起点，其之前是合法前缀。

种类为 InvalidLead、InvalidContinuation、Overlong、Surrogate、TooLarge、Truncated。C0/C1、F5..FF 作为非法起始字节报告 InvalidLead。空输入、内部 NUL、Unicode noncharacter 合法。没有归一化或替换解码。前缀解码在完整首标量之后不检查其余字节。

## 增量协议

`UTF8Validator` 是一个[类](/zh/reference/aggregates/#普通值类)：用 `UTF8Validator::create()` 创建，通过 Write 操作 `push` 和 `feed` 修改。它的私有字段记录字节位置与待完成序列，不保存输入；在类外访问 `state.state` 报告 `CV-ACCESS-CLASS-PRIVATE`。`check_complete`、`processed_bytes` 和 `is_complete` 使用 Read 访问，检查完整性不消耗或关闭验证器，之后仍可输入。push 拒绝时状态不变；feed 拒绝时保留之前已接受字节的进度。发生错误后结束当前验证尝试，改字节重试对应另一个流。

块末尾不等于 EOF。未完成序列可跨块保留，只有 check_complete 才报告截断。逻辑流总长度须能放入 `usize`。

```carven
import std::utf.validation using UTF8Validator;
import std::utf.error using UTF8Error;

let bytes: [u8; 2] = [0x41, 0xe6];
var state = UTF8Validator::create();
try {
    state.feed(bytes)?;
    state.check_complete()?;
} catch {
    UTF8Error(error) => println(error),
}
println(state.processed_bytes());
```

该块在一个三字节序列中间结束，因此 `feed` 成功，`check_complete` 报告截断：

```text
UTF8Error {
    kind: UTF8ErrorKind::Truncated,
    offset: 2,
    sequence_start: 1,
}
2
```
