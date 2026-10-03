---
title: SIMD 向量、掩码与块辅助函数
description: 固定逻辑通道、静态控制、受限加载、字节与浮点辅助函数及原生后端要求。
section: reference
lesson: 18
source: crafts/carven/std/simd/README.md
---

## 类型与后端

向量类型与原语操作内建于 Carven，无需导入。块和算法辅助函数来自 `std::simd.bytes` 或 `std::simd.floats`。向量拥有自己的通道（lane）值，不暴露可取地址的通道或原生寄存器布局。

| 向量    | 元素  | 通道数 | 掩码     | 打包位        |
| ------- | ----- | ------ | -------- | ------------- |
| `u8x16` | `u8`  | 16     | `mask16` | `u16`         |
| `u8x32` | `u8`  | 32     | `mask32` | `u32`         |
| `f32x4` | `f32` | 4      | `mask4`  | `u8` 的低四位 |
| `f32x8` | `f32` | 8      | `mask8`  | `u8`          |

静态执行保存各通道的值，不依赖宿主指令集。每个原生翻译单元在可用时选择 AArch64 NEON，在使用方启用时选择 x86 AVX2，否则使用可移植 C++20 通道实现。各后端遵循同一通道契约，没有运行时分派。AVX2 宽值使用 256 位寄存器，窄操作可使用 128 位；NEON 宽值使用两个 128 位寄存器。逻辑宽度不依赖硬件寄存器宽度。

Carven 和使用方构建规则都不会启用 AVX2。x86 使用方可用 `-mavx2`、`/arch:AVX2` 或 Xmake 的 `add_vectorexts("avx2")` 选择它。使用 SIMD 或运行时文本支持的翻译单元必须选择同一后端。后端专属 inline namespace 赋予运行时类型不同身份，可在链接时检测部分不一致；仅返回类型或包含这些类型的结构体可能不在符号中暴露差异。原生选项与后端一致性由使用方负责。

## 运算符与掩码

字节向量默认全零。`+`、`-` 按通道回绕；`&`、`|`、`^`、`~` 按位操作。浮点向量默认正零，支持 `+`、`-`、`*`、`/` 与一元 `-`，以及对应复合赋值。精确的标量元素类型可在任一操作数位置广播，无后缀字面量取得元素上下文；其他标量类型需要显式转换。

六种比较都产生对应掩码类型。掩码默认 false，使用 `&`、`|`、`^`、`~` 组合，不隐式转为标量 bool。`.any()`、`.all()` 返回 bool，`.count()` 返回 usize；`.first_or(fallback)` 返回第一个为 true 的通道索引或 usize 后备值。`.bits()` 的第 i 位表示第 i 个通道，与内存字节序无关。

`mask.select(yes, no)` 选择匹配向量的各通道。两个向量实参都按源顺序立即求值。宽度和掩码类型之间不隐式转换。SIMD 值不为外围聚合提供标量结构化相等，应显式比较各通道。

## 原语操作

下表中 Vector 表示上述向量之一，Mask 是对应掩码，T 是标量元素类型，N 是通道数。

| 操作                                                    | 契约                                             |
| ------------------------------------------------------- | ------------------------------------------------ |
| `Vector::splat(value)`                                  | 广播一个 T。                                     |
| `Vector::from_array(values)` / `value.to_array()`       | 从 `[T; N]` 复制或复制为它。                     |
| `Vector::load(values, offset)`                          | 恰好读取 N 个元素，无对齐前置条件。              |
| `Vector::load_partial(values, offset, fill)`            | 最多读取 N 个元素，其余填充；offset 不超过长度。 |
| `value.lane(index)` / `value.with_lane(index, element)` | 读取一个通道或返回更新的副本；index 小于 N。     |
| `left.extract(right, offset)`                           | 从拼接值中选 N 个元素，静态 offset 在 `0..=N`。  |
| `Mask::from_bits(bits)`                                 | 展开低 N 位，忽略更高位。                        |
| `Mask::prefix(count)`                                   | 前 count 个通道为 true，count 不超过 N。         |
| `mask.bits()` / `.count()`                              | 打包位 / usize 计数。                            |
| `mask.select(yes, no)`                                  | 按通道选择匹配向量。                             |

字节 `.lookup(indices)` 接受匹配的字节索引向量，每个不小于 N 的索引产生零。查找使用完整逻辑表，包括跨 128 位硬件边界的位置，不同于 AVX2 的通道局部字节 shuffle。`.shift_left(count)`、`.shift_right(count)` 将每个字节移位 `0..7` 位，补零并丢弃移出的位。

extract 偏移与字节移位数是静态输入，由编译器检查并生成原生模板实参。通道索引可动态变化。动态边界非法时终止，静态执行时诊断。部分加载不会读取填充存储或越过输入切片，包括空输入。浮点偏移按元素计数，不按字节。

## Craft 辅助函数

`std::simd.bytes` 使用 32 字节块（`u8x32`、`mask32`），`std::simd.floats` 使用每块 8 个浮点数（`f32x8`、`mask8`）。两者提供 `block_count`、`load_block`、`store`、`store_partial`、静态 `extract` 与静态 `swizzle`。

`block_count` 向上取整而不溢出。`load_block` 返回拥有的块，包含 value、active、offset、len。尾部通道补零且不活动：填充值可能匹配时必须包含 active。offset 等于输入长度时产生空块。store 要求与块同宽的可写固定数组，只读切片不给写权限；store_partial 只更新前 count 个元素。

```carven
import std::simd.bytes using { block_count, load_block };

const fn count_spaces(bytes: [u8]) -> usize {
    var count: usize = 0;
    for index in 0..block_count(bytes) {
        let block = load_block(bytes, index * 32);
        count += ((block.value == 0x20) & block.active).count();
    }
    return count;
}

const spaces = count_spaces("a b c".bytes);
const test "space count" { check(spaces == 2); }
println(count_spaces("a b c".bytes)); // 2
```

字节辅助函数还包括 count_byte、find_byte（未找到时返回长度）、first_or、ascii_digit、JSON 的四个 ascii_whitespace 字节、ascii_lower 与 ascii_prefix。前缀扫描使用 64 字节组，再检查一个 32 字节块及受限标量尾部。原生 UTF 块扫描共享这些向量操作。

辅助函数的控制值是普通[静态参数](/zh/reference/functions/#静态参数)。extract 接受 `0..=N`；字节 `shift_in(previous, current, const count)` 在当前值前加入前一个值的末尾 count 字节，count 在 `0..=32`。字节移位数小于八。swizzle 要求常量 `[u8; N]` 索引，各项小于 N。控制值可来自 const fn、显式常量或 const for 索引；普通 let 和 for 索引不满足要求，转发包装器须保留 const。

普通辅助函数位于独立生成的 C++ 翻译单元，跨模块内联取决于使用方构建设置；静态特化有共享 inline 定义。见[手动构建要求](/zh/reference/toolchain/#构建责任)。

## 浮点执行

每个通道遵循标量 f32 算术。有符号零比较相等，NaN 与任何值都不相等，并使有序比较为 false。常量身份保留浮点位模式，包括零的符号与 NaN 表示。静态算术使用编译器宿主，运行时算术使用目标浮点环境。不保证不同环境下结果相同、NaN 载荷传播或非默认舍入模式。没有融合运算、近似运算、min/max 或水平归约。
