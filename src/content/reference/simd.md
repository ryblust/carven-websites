---
title: "SIMD vectors, masks, and block helpers"
description: "Fixed logical lanes, static controls, bounded loads, byte and float helpers, and native backend requirements."
section: reference
lesson: 23
source: crafts/carven/std/simd/README.md
---

## Types and backends

Vector types and primitive operations are built into Carven and need no import. Import `std::simd.bytes` or `std::simd.floats` for block and algorithm helpers. Vectors own their lanes; no addressable lane or native register layout is exposed.

| Vector  | Element | Lanes | Mask     | Packed bits         |
| ------- | ------- | ----- | -------- | ------------------- |
| `u8x16` | `u8`    | 16    | `mask16` | `u16`               |
| `u8x32` | `u8`    | 32    | `mask32` | `u32`               |
| `f32x4` | `f32`   | 4     | `mask4`  | `u8`, low four bits |
| `f32x8` | `f32`   | 8     | `mask8`  | `u8`                |

Static execution uses owned lanes independently of the host instruction set. Each native translation unit selects AArch64 NEON when available, x86 AVX2 when enabled by the consumer, or a portable C++20 lane implementation. All share the same lane contracts; there is no runtime dispatch. AVX2 wide values use 256-bit registers; narrow operations may use 128-bit registers. NEON wide values use two 128-bit registers. Logical widths do not depend on hardware register widths.

Carven and its consumer build rule do not enable AVX2. An x86 consumer opts in with `-mavx2`, `/arch:AVX2`, or Xmake `add_vectorexts("avx2")`. Translation units using SIMD or runtime text support must select the same backend. Backend-specific inline namespaces give runtime types distinct identities and can detect some mismatches at link time; return types alone or enclosing structs may not expose a mismatch in symbols. Native flags and consistent backend selection belong to the consumer.

## Operators and masks

Byte vectors default to zero. `+` and `-` wrap each lane; `&`, `|`, `^`, and `~` operate on bits. Float vectors default to positive zero and support `+`, `-`, `*`, `/`, and unary `-`. Corresponding compound assignments are supported. An exact scalar element type broadcasts in either operand position; unsuffixed literals receive element context. Other scalar types require an explicit conversion.

All six comparisons produce the vector's mask type. Masks default to false and combine with `&`, `|`, `^`, and `~`. They have no implicit scalar bool conversion. `.any()` and `.all()` return bool; `.count()` returns usize; `.first_or(fallback)` returns the lowest true lane or a usize fallback. `.bits()` packs bit i for lane i independently of memory byte order.

`mask.select(yes, no)` chooses matching vector lanes. Both vector arguments evaluate eagerly in source order. Widths and mask types never convert implicitly. SIMD values do not provide scalar structural equality for enclosing aggregates; compare lanes explicitly.

## Primitive operations

Here `Vector` denotes one vector above, `Mask` its mask, `T` the scalar element type, and `N` the lane count.

| Operation                                               | Contract                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------- |
| `Vector::splat(value)`                                  | Broadcast one T.                                                          |
| `Vector::from_array(values)` / `value.to_array()`       | Copy from/to `[T; N]`.                                                    |
| `Vector::load(values, offset)`                          | Read exactly N elements without an alignment precondition.                |
| `Vector::load_partial(values, offset, fill)`            | Read at most N elements and fill the rest; offset must be at most length. |
| `value.lane(index)` / `value.with_lane(index, element)` | Read one lane or return an updated copy; index must be below N.           |
| `left.extract(right, offset)`                           | Select N elements from the concatenation; static offset is in `0..=N`.    |
| `Mask::from_bits(bits)`                                 | Expand low N bits, ignoring higher bits.                                  |
| `Mask::prefix(count)`                                   | First count lanes true; count must be at most N.                          |
| `mask.bits()` / `.count()`                              | Packed bits / usize count.                                                |
| `mask.select(yes, no)`                                  | Per-lane selection of matching vectors.                                   |

Byte `.lookup(indices)` takes a matching byte vector and returns zero for each index at least N. Lookup uses the whole logical table, including across 128-bit hardware boundaries; it differs from AVX2's lane-local byte shuffle. `.shift_left(count)` and `.shift_right(count)` shift each byte by `0..7` bits with zero fill and discard shifted-out bits.

Extract offsets and byte shift counts are static inputs, checked by the compiler and emitted as native template arguments. Lane indices can be dynamic. Invalid dynamic bounds terminate; static execution diagnoses invalid bounds. Partial loads never read padding or exceed the supplied slice, including empty input. Float offsets count elements rather than bytes.

## Craft helpers

`std::simd.bytes` uses 32-byte blocks (`u8x32`, `mask32`); `std::simd.floats` uses eight-float blocks (`f32x8`, `mask8`). Both provide `block_count`, `load_block`, `store`, `store_partial`, static `extract`, and static `swizzle`.

`block_count` rounds up without overflowing. `load_block` returns an owning block with `value`, `active`, `offset`, and `len`. Tail lanes are zero-filled and inactive: include active whenever padding could match. An offset equal to input length creates an empty block. Stores require writable fixed arrays of the block width; read-only slices grant no write access. `store_partial` updates only its first count elements.

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

Byte helpers also include `count_byte`, `find_byte` (returns length when absent), `first_or`, `ascii_digit`, JSON's four `ascii_whitespace` bytes, `ascii_lower`, and `ascii_prefix`. The prefix scan uses 64-byte groups, then one 32-byte block and a bounded scalar tail. Native UTF block scanning shares these vector operations.

Helper controls are ordinary [static parameters](/reference/functions/#static-parameters). Extract accepts `0..=N`; byte `shift_in(previous, current, const count)` prepends the last count previous bytes, with count in `0..=32`. Byte shift counts are below eight. Swizzle requires constant `[u8; N]` indices, each below N. Controls may come from const fn results, explicit constants, or const for indices. Ordinary let bindings and for indices do not qualify; forwarding wrappers preserve const.

Ordinary helper functions occupy separate generated C++ translation units, so cross-module inlining depends on consumer build settings. Static specializations have shared inline definitions. See [manual build requirements](/reference/toolchain/#build-responsibilities).

## Floating execution

Each lane follows scalar f32 arithmetic. Signed zeros compare equal; NaN compares unequal to every value and makes ordered comparisons false. Constant identity preserves floating bit patterns, including zero signs and NaN representations. Static arithmetic uses the compiler host; runtime arithmetic uses the target floating environment. Results across different environments, NaN payload propagation, and nondefault rounding modes are not promised. Fused operations, approximations, min/max, and horizontal reductions are unavailable.
