---
title: "SIMD 向量、掩码与扫描"
description: "逻辑向量、浮点方法、安全尾块、字节集合与静态特化。"
section: reference
lesson: 23
source: docs/language/simd.md
---

SIMD 让一次运算同时处理多个值。每个位置称为一个通道（lane）：u8x16 包含 16 个字节通道，f32x4 包含 4 个浮点通道。比较的结果是掩码（mask），为每个通道保存一个真假结果。这些类型用于成块计算；需要可增长集合时使用 `Vector<T>`。

## 类型与模块

向量和掩码类型默认可用，属于 `std::simd`；显式导入与别名选择同一类型。块操作从 `std::simd.bytes` 或 `std::simd.floats` 导入，字节集合从 `std::simd.scan` 导入。源码辅助函数 按普通所有权和执行规则组合内建原语。

| 向量    | 元素  | lane 数 | 比较掩码 | 打包位      |
| ------- | ----- | ------- | -------- | ----------- |
| `u8x16` | `u8`  | 16      | `mask16` | `u16`       |
| `u8x32` | `u8`  | 32      | `mask32` | `u32`       |
| `f32x4` | `f32` | 4       | `mask4`  | `u8` 低四位 |
| `f32x8` | `f32` | 8       | `mask8`  | `u8`        |

逻辑宽度独立于原生寄存器宽度；不暴露可取地址的 lane 或寄存器布局。

## 运算符与掩码

字节向量默认零，`+ -` 逐 lane 回绕，支持 `& | ^ ~`。浮点默认正零，支持 `+ - * /` 与一元负号及对应复合赋值。精确元素类型的标量可在任一侧广播；字面量接受元素上下文，其他数值类型须显式转换。

六种比较均返回同形掩码。掩码默认全 false，支持 `& | ^ ~`，不能隐式转 bool。用 `.any()`、`.all()`、`.count()`、`.first_or(fallback)`、`.bits()` 查询。bit i 表示 lane i，与字节序无关；first_or 返回首个 true lane 或 usize 回退值。

`.select(yes, no)` 接受两个匹配向量，按源码顺序立即求值两者。不同宽度和掩码不会隐式转换。包含 SIMD 的复合值没有自动标量结构相等，需显式比较 lane。

## 构造与加载

下表中 Vector 表示上述任一向量，Mask 为对应掩码，T 为元素类型，N 为 lane 数；它与拥有序列 `Vector<T>` 不同。

| 操作                                         | 契约                                   |
| -------------------------------------------- | -------------------------------------- |
| `Vector::splat(value)`                       | 广播一个 T                             |
| `Vector::from_array(values)`                 | 复制 `[T; N]`                          |
| `Vector::load(values, offset)`               | 无对齐前提，读恰好 N 项                |
| `Vector::load_partial(values, offset, fill)` | 最多 N 项，其余填充；offset 不大于长度 |
| `Mask::from_bits(bits)`                      | 展开低 N 位                            |
| `Mask::prefix(count)`                        | 前 count lane 为 true；count 不大于 N  |

关联操作写 `Type::function(...)`，类型别名保留相同操作；值方法写 `value.method(...)`。

## 向量与掩码方法

| 操作                                                   | 契约                                          |
| ------------------------------------------------------ | --------------------------------------------- |
| `value.to_array()`                                     | 复制到 `[T; N]`                               |
| `value.lane(index)`、`value.with_lane(index, element)` | 读取或返回修改副本；index 小于 N              |
| `value.swizzle(indices)`                               | 用静态 `[u8; N]` 重排，索引均小于 N，允许重复 |
| `left.extract(right, offset)`                          | 从拼接值取 N 项；静态 offset 位于 `0..=N`     |
| `mask.bits()`、`.count()`                              | 打包位、usize 数量                            |
| `mask.select(yes, no)`                                 | 逐 lane 选择匹配向量                          |

字节向量 `.sum() -> usize` 精确求和，上限 N×255，不回绕。`.lookup(indices)` 接受任一字节向量宽度，表宽决定有效索引，索引向量决定结果宽；超表宽返回零，支持跨原生寄存器边界索引。

`.shift_left(count)`、`.shift_right(count)` 每字节移 `0..7` 位、零填充；移位与 extract 输入为静态值，编译器检查边界。swizzle 控制可由 const fn、显式常量或 const for 索引提供，不能依赖普通运行时局部值。

动态越界终止，静态执行诊断。部分加载不读 padding 或切片外数据，包括空输入；浮点 offset 计元素。

## 浮点方法

f32x4 与 f32x8 在静态、解释和原生执行中提供：

| 方法                         | 契约                                              |
| ---------------------------- | ------------------------------------------------- |
| `.is_finite()`               | 逐 lane 返回有限性掩码                            |
| `.sqrt()`                    | 保留带符号零和正无穷；负非零、负无穷和 NaN 为 NaN |
| `.abs()`                     | 正幅值，两种零均转正零，NaN 保持 NaN              |
| `.min(other)`、`.max(other)` | 任一 NaN 即传播；相等保留接收者，包括零符号       |
| `.clamp(lower, upper)`       | 逐 lane 检查界限，保留值的 NaN，其余选择值或界限  |

other、lower、upper 接受同形向量或 f32 广播；字面量接受 f32 上下文，其他类型需转换。clamp 每 lane 都要求 lower <= upper；逆序或 NaN 界限触发断言，即使丢弃结果。接收者和实参按源码顺序各求值一次。

```carven
let samples = f32x8::splat(-4.0);
let magnitudes = samples.abs().sqrt();
let bounded = magnitudes.clamp(0.0, 1.0);
assert(bounded.is_finite().all());
```

## 块与字节 helper

`ByteBlock` 包含 u8x32、mask32，`FloatBlock` 包含 f32x8、mask8。两类 helper 提供 `block_count` 和 `load_block`。load_block 返回 `value`、`active`、`offset`、`length`；尾部补零且标记不活动，padding 可能匹配时必须结合 active。offset 等于输入长度时得到空块。

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
```

字节 helper 包括 `count_byte`、`find_byte`（未找到为长度）、`ascii_digit`、`ascii_lower`、`ascii_prefix`（首个非 ASCII 偏移）。它们处理编码字节。用 `.to_array()` 得到拥有型固定数组，再通过普通赋值写入可变目标。

## 字节集合扫描

`std::simd.scan` 的 `one_of([u8])` 构造 ByteSet；`byte_range(lower, upper)` 包含两端，要求 lower <= upper。支持全部字节，包括 NUL 与 FF。`set_union(left, right)` 合并集合，重复无影响。文本 `.bytes` 表示编码字节。

`match_set(value, const set)` 分类 u8x32。`count_where`、`find_where`、`prefix_where` 查询完整切片，分别返回数量、首个匹配偏移、开头匹配长度；未找到为输入长度，空输入都为零。

```carven
import std::simd.scan using { one_of, count_where, find_where };

const punctuation = one_of("{}[]:,".bytes);
const fn count_punctuation(text: str) -> usize => count_where(text.bytes, punctuation);
const fn first_punctuation(text: str) => find_where(text.bytes, punctuation);
```

查询均为 const fn，静态集合特化匹配工作，结果保持普通成员与位置契约。完整切片查询安全处理尾部。`find_from(bytes, start, set)` 从 start 搜索，`prefix_end(bytes, start, set)` 返回从该处起连续匹配的结束位置；允许 start 等于长度，不能更大。find_where 与 prefix_where 从零开始。

## 浮点执行

逐 lane 遵循标量 f32。两种零相等，NaN 与任意值不等且有序比较为 false。常量身份保留浮点位，包括零符号和 NaN 表示。静态算术使用编译器宿主环境，普通运行时使用目标环境；跨环境一致性、NaN 载荷 传播、非默认舍入未指定。不提供融合运算、近似指令或浮点横向归约。
