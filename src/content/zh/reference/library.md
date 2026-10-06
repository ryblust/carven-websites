---
title: "标准库"
description: "查阅全部公开 UTF 与 SIMD Craft API、签名、执行阶段和导入路径。"
section: reference
lesson: 21
source: crafts/carven/std/README.md
---

## 选择所需能力

官方 `carven` Craft 提供七个公开标准库模块：五个用于 Unicode 与 UTF-8，两个用于 SIMD 算法。本页索引它们导出的类型、函数和类操作。完整契约见 [UTF 参考](/zh/reference/utf/)与 [SIMD 参考](/zh/reference/simd/)。

| 需求                          | 模块                  | API                                                                    |
| ----------------------------- | --------------------- | ---------------------------------------------------------------------- |
| 转换 Unicode 标量数值         | `std::utf.scalar`     | `char_from_u32`、`UnicodeScalarError`                                  |
| 编码字符或解码一个 UTF-8 前缀 | `std::utf.codec`      | `encode_utf8`、`decode_utf8_prefix`、`UTF8Encoded`、`UTF8DecodeResult` |
| 查看 UTF-8 失败               | `std::utf.error`      | `UTF8Error`、`UTF8ErrorKind`                                           |
| 验证整个缓冲区或分块字节流    | `std::utf.validation` | `validate_utf8`、`UTF8Validator`                                       |
| 将已验证字节构造为文本        | `std::utf.text`       | `from_utf8`、`to_string`                                               |
| 扫描和转换 32 字节块          | `std::simd.bytes`     | `ByteBlock`、字节查找、ASCII 分类、块加载与写回                        |
| 遍历和重排八浮点数块          | `std::simd.floats`    | `FloatBlock`、块加载与写回、提取与重排                                 |

包内还包含 `std::utf.scan` 和 `std::utf.block`，供 `carven` Craft 内部实现 UTF 算法。它们的声明没有 `export` 修饰符，应用模块无法访问；它们是实现依赖，不是额外的公开 API。

## 内建能力与 Crafts

| 层次         | 示例                                                          | 用法                                                          |
| ------------ | ------------------------------------------------------------- | ------------------------------------------------------------- |
| 语言内建能力 | `println`、`assert`、`String`、文本与切片操作、向量与掩码原语 | 无需导入，见[内建函数](/zh/reference/builtins/)               |
| 标准 Crafts  | 检查后的 UTF 转换、UTF 验证、字节查找、SIMD 块辅助函数        | 从对应 `std::` 模块导入已导出的 API                           |
| 原生 C++ 库  | C++ 标准库容器与第三方库                                      | 使用 [C++ 互操作](/zh/reference/interop/)，并提供原生构建依赖 |

Crafts 是普通的 Carven 源码库，函数遵循与应用相同的类型、Read/Write/Take、失败契约和受支持的编译期执行规则。runtime 支持头文件实现生成的语言操作；Carven 源码使用内建能力时无需导入这些头文件。

## 导入模块 API

导入写在其他声明和语句之前。可以选择一个名称或多个名称：

```carven
import std::simd.bytes using { count_byte, find_byte };

const row = "name,age,city";
const commas = count_byte(row.bytes, 0x2c);

const test {
    check(commas == 2);
    check(find_byte(row.bytes, 0x2c) == 4);
}

println(commas);
```

这个完整程序输出 `2`，匿名测试在编译时执行。`std::` 选择官方 Craft：`std::simd.bytes` 解析为 `crafts.carven.std.simd.bytes`；普通 `std.simd.bytes` 则选择当前 Craft 域内的路径。

`carven`、`check`、`compile` 和 `interpret` 命令从 Crafts 根目录收集官方包，再由导入解析选择当前编译批次中的模块。名称仍需显式导入；只有 `export` 声明可以跨 Craft 边界访问。源码收集与可见性见[模块与导入](/zh/reference/modules/)。

## Unicode 标量与 UTF-8 API

### 类型与失败载荷

| 模块                  | 类型                 | 公开内容                                                                                     |
| --------------------- | -------------------- | -------------------------------------------------------------------------------------------- |
| `std::utf.scalar`     | `UnicodeScalarError` | 结构体：`value: u32`，保存被拒绝的标量数值                                                   |
| `std::utf.codec`      | `UTF8Encoded`        | 结构体：`bytes: [u8; 4]`、`width: usize`；只有前 `width` 字节属于编码                        |
| `std::utf.codec`      | `UTF8DecodeResult`   | 枚举：`End`、`Scalar(char, usize)`；载荷为字符与字节宽度                                     |
| `std::utf.error`      | `UTF8ErrorKind`      | 枚举：`InvalidLead`、`InvalidContinuation`、`Overlong`、`Surrogate`、`TooLarge`、`Truncated` |
| `std::utf.error`      | `UTF8Error`          | 结构体：`kind: UTF8ErrorKind`、`offset: usize`、`sequence_start: usize`                      |
| `std::utf.validation` | `UTF8Validator`      | 类，提供下列六个公开操作；验证状态保持私有                                                   |

`UTF8Error` 的位置从零开始，按逻辑字节流中的字节计数。`offset` 指向被拒绝的字节，截断时指向输入结尾；`sequence_start` 指向无效序列的起点。标量转换拒绝 U+D800 到 U+DFFF，以及大于 U+10FFFF 的数值。

### 转换与整块验证

这里的所有实参采用 Read 访问。`throw` 列出的类型化失败需要处理，或用 `?` 传播。

| 模块                  | 签名                                                                           | 执行与结果                                  |
| --------------------- | ------------------------------------------------------------------------------ | ------------------------------------------- |
| `std::utf.scalar`     | `const fn char_from_u32(value: u32) -> char throw UnicodeScalarError`          | 检查标量数值并返回字符                      |
| `std::utf.codec`      | `const fn encode_utf8(character: char) -> UTF8Encoded`                         | 编码一个字符；未使用的数组字节为零          |
| `std::utf.codec`      | `const fn decode_utf8_prefix(bytes: [u8]) -> UTF8DecodeResult throw UTF8Error` | 空输入得到 `.End`；否则只解码第一个完整标量 |
| `std::utf.validation` | `const fn validate_utf8(bytes: [u8]) -> void throw UTF8Error`                  | 验证整个缓冲区，不分配存储                  |
| `std::utf.text`       | `fn from_utf8(bytes: [u8]) -> str throw UTF8Error`                             | 验证后借用同一存储；运行时执行              |
| `std::utf.text`       | `fn to_string(bytes: [u8]) -> String throw UTF8Error`                          | 验证后复制到独立的拥有型存储；运行时执行    |

能够控制源存储的生命周期，并保持其不变时，选择 `from_utf8`；结果需要独立保存或返回时，选择 `to_string`：

```carven
import std::utf.text using { from_utf8, to_string };

let bytes: [u8; 3] = [0xe6, 0x88, 0x91];
let borrowed = from_utf8(bytes)?;
let owned = to_string(bytes)?;

println(borrowed, owned);
```

原生执行输出 `我 我`。第一个结果保留对 `bytes` 的受检查借用，第二个拥有独立副本。两个调用都保留 `UTF8Error` 义务。数组在参数上下文中转换为字节切片。当前解释器，包括 Playground 的 Run，会以 `CV-INTERPRET-ADMISSION` 拒绝这两个构造函数内部使用的未检查文本构造；此示例需要原生执行。

### 增量验证器

这些操作属于 `std::utf.validation.UTF8Validator`。先用 `UTF8Validator::create()` 创建值，其他调用以验证器值作为接收者。

| 签名                                              | 访问与行为                                               |
| ------------------------------------------------- | -------------------------------------------------------- |
| `UTF8Validator::create() -> UTF8Validator`        | 开始一次新的验证                                         |
| `state.push(byte: u8) -> void throw UTF8Error`    | Write 接收者；接受一个字节；拒绝时状态不变               |
| `state.feed(bytes: [u8]) -> void throw UTF8Error` | Write 接收者；接受一块输入；拒绝时保留此前接受字节的进度 |
| `state.check_complete() -> void throw UTF8Error`  | Read 接收者；在逻辑 EOF 处报告未完成的标量               |
| `state.is_complete() -> bool`                     | Read 接收者；检查是否没有未完成标量                      |
| `state.processed_bytes() -> usize`                | Read 接收者；返回已接受字节数                            |

`push` 或 `feed` 修改的接收者需要 `var`。块边界不是 EOF，字符编码可以跨块。`check_complete` 不消耗或关闭验证器。验证器保存验证状态，不保留输入块；复制值后，两次验证拥有各自的状态副本。类操作需要运行时执行。

完整恢复与截断示例见 [UTF 流式验证与错误规则](/zh/reference/utf/)。公开实现位于 [scalar.cv](https://github.com/ryblust/carven/blob/main/crafts/carven/std/utf/scalar.cv)、[codec.cv](https://github.com/ryblust/carven/blob/main/crafts/carven/std/utf/codec.cv)、[error.cv](https://github.com/ryblust/carven/blob/main/crafts/carven/std/utf/error.cv)、[validation.cv](https://github.com/ryblust/carven/blob/main/crafts/carven/std/utf/validation.cv) 与 [text.cv](https://github.com/ryblust/carven/blob/main/crafts/carven/std/utf/text.cv)。

## 字节算法与块辅助函数

`std::simd.bytes` 的所有函数均为 `export const fn`，支持运行时调用与受支持的编译期执行。`ByteBlock` 包含 `value: u8x32`、`active: mask32`、`offset: usize`、`len: usize`，拥有加载的各 lane；`active` 标记真实输入位置，`len` 是有效 lane 数。

### 查找与 ASCII 操作

| 签名                                               | 结果                                               |
| -------------------------------------------------- | -------------------------------------------------- |
| `count_byte(bytes: [u8], needle: u8) -> usize`     | 统计整个切片中的匹配数                             |
| `find_byte(bytes: [u8], needle: u8) -> usize`      | 返回首个匹配字节的位置；未找到时返回 `bytes.len()` |
| `ascii_prefix(bytes: [u8]) -> usize`               | 返回开头连续小于 `0x80` 的字节数                   |
| `first_or(mask: mask32, fallback: usize) -> usize` | 返回掩码最低有效 lane，或回退值                    |
| `ascii_digit(bytes: u8x32) -> mask32`              | 标记 ASCII `0` 到 `9`                              |
| `ascii_whitespace(bytes: u8x32) -> mask32`         | 标记 JSON 空白：空格、tab、LF 与 CR                |
| `ascii_lower(bytes: u8x32) -> u8x32`               | 将 ASCII `A` 到 `Z` 转为小写，其他 lane 不变       |

这些操作按字节分类，不进行 Unicode 大小写转换。对不完整块应用分类掩码时，与 `block.active` 求交，排除补零位置。

### 加载与写回

| 签名                                                                        | 契约                                                     |
| --------------------------------------------------------------------------- | -------------------------------------------------------- |
| `block_count(bytes: [u8]) -> usize`                                         | 按 32 字节块向上取整，不发生溢出                         |
| `load_block(bytes: [u8], offset: usize) -> ByteBlock`                       | 最多读取 32 字节，其余补零；要求 `offset <= bytes.len()` |
| `store(value: u8x32, &destination: [u8; 32]) -> void`                       | 替换目标的全部元素                                       |
| `store_partial(value: u8x32, &destination: [u8; 32], count: usize) -> void` | 只替换前 `count` 个元素；要求 `count <= 32`              |

写回要求定长数组的 Write 访问，调用时写 `&destination`，只读切片不能作为目标。在输入末尾加载，会返回没有有效 lane 的块。

### 静态重排控制

| 签名                                                                     | 契约                                                                                           |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `extract(left: u8x32, right: u8x32, const offset: usize) -> u8x32`       | 从两个拼接向量中提取 32 个 lane；`offset` 在 `0..=32` 内                                       |
| `shift_in(previous: u8x32, current: u8x32, const count: usize) -> u8x32` | 把 previous 的末尾 `count` 字节放在 current 的前 `32 - count` 字节之前；`count` 在 `0..=32` 内 |
| `shift_left(value: u8x32, const count: usize) -> u8x32`                  | 每个字节左移 `0..7` 位，零填充                                                                 |
| `shift_right(value: u8x32, const count: usize) -> u8x32`                 | 每个字节右移 `0..7` 位，零填充                                                                 |
| `swizzle(value: u8x32, const indices: [u8; 32]) -> u8x32`                | 为每个结果 lane 选择源位置；每个索引都小于 32                                                  |

标记 `const` 的控制参数必须是静态实参。普通 `let` 或运行时循环索引不满足要求；转发包装器的参数也需保留 `const`。参见[静态参数](/zh/reference/functions/#静态参数)与[字节实现](https://github.com/ryblust/carven/blob/main/crafts/carven/std/simd/bytes.cv)。

## 浮点块辅助函数

`std::simd.floats` 的六个函数均为 `export const fn`。`FloatBlock` 包含 `value: f32x8`、`active: mask8`、`offset: usize`、`len: usize`。位置与长度按浮点元素计数，不按字节计数。

| 签名                                                                        | 契约                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `block_count(values: [f32]) -> usize`                                       | 按八元素块向上取整，不发生溢出                                |
| `load_block(values: [f32], offset: usize) -> FloatBlock`                    | 最多读取八个元素，其余填 `0.0`；要求 `offset <= values.len()` |
| `extract(left: f32x8, right: f32x8, const offset: usize) -> f32x8`          | 从拼接向量中提取八个 lane；`offset` 在 `0..=8` 内             |
| `swizzle(value: f32x8, const indices: [u8; 8]) -> f32x8`                    | 为每个结果 lane 选择源位置；每个索引都小于八                  |
| `store(value: f32x8, &destination: [f32; 8]) -> void`                       | 替换目标的全部八个元素                                        |
| `store_partial(value: f32x8, &destination: [f32; 8], count: usize) -> void` | 只替换前 `count` 个元素；要求 `count <= 8`                    |

```carven
import std::simd.floats using { load_block, store_partial };

let values: [f32; 3] = [1.0, 2.0, 3.0];
let block = load_block(values, 0);
var result: [f32; 8] = {};
store_partial(block.value * 2.0, &result, block.len);

println(result[0], result[1], result[2], block.active.count());
```

输出 `2 4 6 3`。只写入三个结果元素，其余五个保持默认零值。原语算术在各 lane 上遵循标量 `f32` 规则，目前不支持水平归约和融合运算。参见[浮点实现](https://github.com/ryblust/carven/blob/main/crafts/carven/std/simd/floats.cv)与 [SIMD 执行规则](/zh/reference/simd/)。

## 编译与运行库代码

`const fn` 使函数可以在编译期执行。普通运行时调用仍在运行时执行；`const` 初始化、块或测试显式请求静态阶段。UTF 文本构造函数与增量验证器需要运行时执行。静态执行遵循语言统一的步数、深度与存储预算。

生成的 C++ 使用匹配的 runtime 头文件。手动原生构建需要同时编译生成的 Craft 实现与应用文件。使用 SIMD 或 runtime 文本支持的翻译单元应保持后端选项一致。参见[工具链构建职责](/zh/reference/toolchain/)与 [runtime 和 Craft 边界](/zh/internals/runtime-boundary/)。

[标准 Craft 源码总览](https://github.com/ryblust/carven/blob/main/crafts/carven/std/README.md)说明已提供的包。未来提案只有在实现可用后，才进入这里的 API 索引。
