---
title: UTF 标准库
description: 标量转换、UTF-8 编解码、拥有与借用文本、增量验证。
section: reference
lesson: 19
source: crafts/carven/std/utf/README.md
---

## 模块与接口

标准库模块由构建系统加入输入批次。使用 `import std::utf.text using to_string;` 等选择具体能力。

| 模块                | 内容                                          |
| ------------------- | --------------------------------------------- |
| std::utf.scalar     | UnicodeScalarError、标量转换                  |
| std::utf.codec      | UTF8Encoded、UTF8Decode、前缀解码和编码       |
| std::utf.validation | UTF8ErrorKind、UTF8Error、UTF8Validator、验证 |
| std::utf.text       | 借用与拥有文本构造                            |

| 操作                                                         | 结果                                     |
| ------------------------------------------------------------ | ---------------------------------------- |
| `validate_utf8(bytes: [u8]) throw UTF8Error`                 | 无分配检查整个输入                       |
| `from_utf8(bytes: [u8]) -> str throw UTF8Error`              | 验证后借用相同存储                       |
| `to_string(bytes: [u8]) -> String throw UTF8Error`           | 验证后独立复制                           |
| `decode_utf8(bytes: [u8]) -> UTF8Decode throw UTF8Error`     | 空输入 End，否则首个 Scalar(char, usize) |
| `encode_utf8(character: char) -> UTF8Encoded`                | 四字节数组 bytes 与有效 width            |
| `char_from_u32(value: u32) -> char throw UnicodeScalarError` | 检查标量范围                             |
| `char_to_u32(value: char) -> u32`                            | 标量编号                                 |
| `validator() -> UTF8Validator`                               | 新验证状态                               |
| `push(&state, byte: u8) throw UTF8Error`                     | 接受一个字节                             |
| `feed(&state, bytes: [u8]) throw UTF8Error`                  | 接受一个块                               |
| `finish(state) throw UTF8Error`                              | 声明逻辑 EOF                             |

数组可隐式转字节切片，也可显式 as_slice；文本 `.bytes` 提供切片。from_utf8 的结果借用输入，必须保持 backing 存活且不变；to_string 的结果独立，可从局部数组安全返回。

```carven
import std::utf.text using to_string;
import std::utf.validation using UTF8Error;

fn text() -> String throw UTF8Error {
    let bytes: [u8; 4] = [0xf0, 0x9f, 0x98, 0x80];
    return to_string(bytes)?;
}
```

## 错误位置

UTF8Error 包含 kind、offset、sequence_start。偏移均是逻辑流中的零基字节位置。offset 指向拒绝字节，EOF 截断时指向末尾；sequence_start 指向非法序列起点，其之前是合法前缀。

种类为 InvalidLead、InvalidContinuation、Overlong、Surrogate、TooLarge、Truncated。C0/C1、F5..FF 作为非法起始字节报告 InvalidLead。空输入、内部 NUL、Unicode noncharacter 合法。没有归一化或替换解码。前缀解码在完整首标量之后不检查其余字节。

## 增量协议

通过 validator 初始化，使用 push/feed 修改。状态记录字节位置与待完成序列，不保存输入。push 拒绝时状态不变；feed 拒绝时保留之前已接受字节的进度。发生错误后结束当前验证尝试，改字节重试对应另一个流。

块末尾不等于 EOF。未完成序列可跨块保留，只有 finish 才报告截断。逻辑流总长度须能放入 usize。
