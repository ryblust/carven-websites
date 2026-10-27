---
title: "SIMD vectors and masks"
description: "Logical vector lanes, floating methods, safe tails, byte sets, and static specialization."
section: reference
lesson: 22
source: docs/language/simd.md
---

SIMD applies one operation to several values at once. Each position is a lane: `u8x16` has sixteen byte lanes, and `f32x4` has four floating lanes. Comparing vectors produces a mask with one Boolean decision per lane. Use these types for block processing; use `Vector<T>` when you need a growable collection.

## Types and modules

Vector and mask types are available by default and belong to `std::simd`.
Explicit imports and aliases select the same types. Import block helpers from
`std::simd.bytes` or `std::simd.floats`, and byte-set queries from `std::simd.scan`.
Source helpers compose the builtin primitives under ordinary ownership and
execution rules.

| Vector  | Element | Lanes | Comparison mask | Packed mask bits     |
| ------- | ------- | ----- | --------------- | -------------------- |
| `u8x16` | `u8`    | 16    | `mask16`        | `u16`                |
| `u8x32` | `u8`    | 32    | `mask32`        | `u32`                |
| `f32x4` | `f32`   | 4     | `mask4`         | `u8` (low four bits) |
| `f32x8` | `f32`   | 8     | `mask8`         | `u8`                 |

Logical lane widths and operations are independent of native register widths.

## Operators and masks

Byte vectors default to zero. `+` and `-` wrap per lane; `&`, `|`, `^`, and `~`
operate on bits. Float vectors default to positive zero and support `+ - * /`
and unary `-`. Corresponding compound assignments are supported. An exact
scalar element type broadcasts in either operand position; literals receive
that type's context. Other scalar types require explicit conversion.

All six comparisons return the vector's mask type. Masks default to false and
combine with `&`, `|`, `^`, and `~`. They never implicitly convert to scalar
bools. Use `.any()`, `.all()`, `.count()`, `.first_or(fallback)`, or `.bits()`.
Bit `i` denotes lane `i`, independent of memory byte order. `first_or` returns
the lowest true lane or the supplied `usize` fallback. `.select(yes, no)` takes
two matching vectors and eagerly evaluates both arguments in source order.
Widths and mask types do not implicitly convert to each other.

SIMD values own their lanes without exposing addressable lanes or native register
layout. They do not provide scalar structural equality for enclosing aggregates;
compare vector lanes explicitly.

## Construction and loading

In this table, `Vector` is any vector above, `Mask` its mask, `T` its element,
and `N` its lane count. `Bits` is the packed mask integer type from the type table.

| Operation                                                             | Contract                                                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `Vector::splat(value: T) -> Vector`                                   | Broadcast one `T`.                                                                                           |
| `Vector::from_array(values: [T; N]) -> Vector`                        | Copy from `[T; N]`.                                                                                          |
| `Vector::load(values: [T], offset: usize) -> Vector`                  | Read exactly `N` elements; require `offset <= length` and `N <= length - offset`. No alignment precondition. |
| `Vector::load_partial(values: [T], offset: usize, fill: T) -> Vector` | Read at most `N` elements and fill the rest; `offset <= length`.                                             |
| `Mask::from_bits(bits: Bits) -> Mask`                                 | Expand packed bits; ignore bits above `N`.                                                                   |
| `Mask::prefix(count: usize) -> Mask`                                  | First `count` lanes true; `count <= N`.                                                                      |

Associated functions use `Type::function(...)`; aliases provide the same operations. Value methods use `value.method(...)`. Built-in constructors and methods require direct calls and cannot be stored as callable values. Runtime operands use Read access.

## Vector and mask methods

| Operation                                                                               | Contract                                                                              |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `value.to_array() -> [T; N]`                                                            | Copy to `[T; N]`.                                                                     |
| `value.lane(index: usize) -> T` / `value.with_lane(index: usize, element: T) -> Vector` | Read a lane or return an updated copy; `index < N`.                                   |
| `value.swizzle(const indices: [u8; N]) -> Vector`                                       | Select lanes using a static `[u8; N]`; every index is below `N`.                      |
| `left.extract(right: Vector, const offset: usize) -> Vector`                            | Take `N` elements from the concatenation at `offset`, in `0..=N`; `offset` is static. |

### Mask queries and byte operations

All calls below use Read access and evaluate their runtime operands once. `ByteVector` means either `u8x16` or `u8x32`; the lookup result has the indices vector's type.

| Call                                                                             | Result or requirement                                  |
| -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `mask.bits()`                                                                    | `Bits`                                                 |
| `mask.any()` / `mask.all()`                                                      | `bool`; at least one / every lane is true              |
| `mask.count()`                                                                   | `usize`                                                |
| `mask.first_or(fallback: usize)`                                                 | `usize`; lowest true lane, or the fallback unchanged   |
| `mask.select(yes: Vector, no: Vector)`                                           | `Vector` with matching shape                           |
| `bytes.sum()`                                                                    | `usize`                                                |
| `bytes.lookup(indices: ByteVector)`                                              | `ByteVector` matching the indices width                |
| `bytes.shift_left(const count: usize)` / `bytes.shift_right(const count: usize)` | Receiver's byte-vector type; static `count` in `0..=7` |

Byte vectors expose `.sum() -> usize`, the exact mathematical sum of all lanes.
The maximum is `N * 255`; the reduction does not wrap. They also expose
`.lookup(indices)` with either byte-vector width. The table width determines
the valid indices; an index at or above that width yields zero. The indices
vector determines the result width. All four combinations of 16- and 32-byte
tables and indices are supported. Lookup uses the entire logical table,
including indices crossing native register boundaries. `.shift_left(count)` and
`.shift_right(count)` shift every byte independently by `0..7` bits, zero-fill,
and discard shifted-out bits. Extract offsets and shift counts are static inputs;
the compiler checks their bounds.

Swizzle permits duplicate indices and returns the receiver's vector shape.
Its controls can come from `const fn`, explicit constants, or `const for` indices
and require a constant source independent of runtime locals.

These built-in constructors and methods have no typed failures. Invalid dynamic bounds terminate; static execution diagnoses them.
Partial loads never rely on padding or read outside the supplied slice, including
empty input. Float offsets count elements rather than bytes.

## Floating methods

`f32x4` and `f32x8` provide these Read methods in static execution,
interpretation, and native execution:

| Method                                  | Result and contract                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `value.is_finite()`                     | `mask4` or `mask8`; each lane is true for finite values.                                     |
| `value.sqrt()`                          | Preserve signed zero and +infinity; negative nonzero values, -infinity, and NaN produce NaN. |
| `value.abs()`                           | Absolute value per lane; both +0 and -0 become +0; NaN remains NaN.                          |
| `value.min(other)` / `value.max(other)` | Propagate either NaN; equal values retain the receiver, including its zero sign.             |
| `value.clamp(lower, upper)`             | Check bounds per lane; preserve a NaN value and return the selected bound or value.          |

`other`, `lower`, and `upper` each accept either the receiver's vector type or
an `f32` scalar broadcast to every lane. Unsuffixed literals receive `f32`
context. Other scalar types require an explicit conversion to `f32`; vector
arguments must match the receiver's shape.

Numeric results retain the receiver's vector shape. Clamp requires
`lower <= upper` in every lane; a reversed or NaN bound in any lane causes an
assertion failure, even when the result is discarded. The receiver and arguments
evaluate once in source order before the operation.

```carven run
let samples = f32x8::splat(-4.0);
let magnitudes = samples.abs().sqrt();
let bounded = magnitudes.clamp(0.0, 1.0);
assert(bounded.is_finite().all());
```

## Block and byte helpers

`std::simd.bytes` and `std::simd.floats` each provide `block_count` and `load_block`; their signatures and block fields are listed below. `block_count` includes a partial tail block. Tail lanes are zero-filled and inactive, so include `active` whenever padding could match. An offset equal to the input length produces an empty block.

```carven run
import std::simd.bytes using { block_count, load_block }

const fn count_spaces(bytes: [u8]) -> usize {
    var count: usize = 0;
    for index in 0..block_count(bytes) {
        let block = load_block(bytes, index * 32);
        count += ((block.value == 0x20) & block.active).count();
    }
    return count;
}

fn main() {
    println(count_spaces("a b c".bytes)); // 2
}
```

### Block records and helper signatures

Every helper in this section is `const fn` and has no typed failure. Its operations still perform their stated bounds checks.

| Module             | Public type and fields                                                     |
| ------------------ | -------------------------------------------------------------------------- |
| `std::simd.bytes`  | `ByteBlock { value: u8x32, active: mask32, offset: usize, length: usize }` |
| `std::simd.floats` | `FloatBlock { value: f32x8, active: mask8, offset: usize, length: usize }` |

| Module             | Function                                                 |
| ------------------ | -------------------------------------------------------- |
| `std::simd.bytes`  | `block_count(bytes: [u8]) -> usize`                      |
| `std::simd.bytes`  | `load_block(bytes: [u8], offset: usize) -> ByteBlock`    |
| `std::simd.floats` | `block_count(values: [f32]) -> usize`                    |
| `std::simd.floats` | `load_block(values: [f32], offset: usize) -> FloatBlock` |
| `std::simd.bytes`  | `count_byte(bytes: [u8], needle: u8) -> usize`           |
| `std::simd.bytes`  | `find_byte(bytes: [u8], needle: u8) -> usize`            |
| `std::simd.bytes`  | `ascii_digit(bytes: u8x32) -> mask32`                    |
| `std::simd.bytes`  | `ascii_lower(bytes: u8x32) -> u8x32`                     |
| `std::simd.bytes`  | `ascii_prefix(bytes: [u8]) -> usize`                     |

`ascii_digit` marks ASCII `0` through `9`. `ascii_lower` changes ASCII `A` through `Z` to lowercase and preserves other bytes. `ascii_prefix` returns the first non-ASCII byte offset, or the input length when all bytes are ASCII. Each block's `length` is its number of valid input elements; `offset` is the supplied element offset.

`count_byte` returns the number of matching bytes; `find_byte` returns the first matching byte offset or the input length when absent. These helpers process encoded bytes. Use `value.to_array()` to obtain an owning fixed array; ordinary assignment writes it to a mutable destination.

## Byte-set scanning

`ByteSet` is a public struct with `words: [u64; 4]`. Bit `byte % 64` of `words[byte / 64]` records membership of that byte. Each of the 256 bits represents one byte; any combination is valid.

| Function from `std::simd.scan`                              | Result    |
| ----------------------------------------------------------- | --------- |
| `one_of(values: [u8])`                                      | `ByteSet` |
| `byte_range(lower: u8, upper: u8)`                          | `ByteSet` |
| `set_union(left: ByteSet, right: ByteSet)`                  | `ByteSet` |
| `match_set(value: u8x32, const set: ByteSet)`               | `mask32`  |
| `count_where(bytes: [u8], const set: ByteSet)`              | `usize`   |
| `find_where(bytes: [u8], const set: ByteSet)`               | `usize`   |
| `find_from(bytes: [u8], start: usize, const set: ByteSet)`  | `usize`   |
| `prefix_where(bytes: [u8], const set: ByteSet)`             | `usize`   |
| `prefix_end(bytes: [u8], start: usize, const set: ByteSet)` | `usize`   |

Every function is `const fn` and has no typed failure. The matching and query functions require a static `set` argument: use a constant, static parameter, or admitted constant expression. An ordinary runtime `let set = ...` does not supply it. Byte slices and starting positions remain runtime inputs.

`std::simd.scan` supplies byte-set queries. `one_of([u8])` constructs a `ByteSet`;
`byte_range(lower, upper)` includes both endpoints and requires `lower <= upper`.
Membership includes all byte values, including NUL and FF.
`set_union(left, right)` combines two sets; duplicates have no effect. A text's
`.bytes` denotes encoded bytes, not Unicode characters.

`match_set(value, const set)` classifies a raw `u8x32`. `count_where`, `find_where`,
and `prefix_where` query an entire byte slice. `find_where` returns the first
matching byte offset, or the input length when absent. `prefix_where` returns the
leading matching run length, including the input length when every byte matches. Empty
input returns zero for all three queries.

```carven
import std::simd.scan using { one_of, count_where, find_where }

const punctuation = one_of("{}[]:,".bytes);
const fn count_punctuation(text: str) -> usize => count_where(text.bytes, punctuation);
const fn first_punctuation(text: str) => find_where(text.bytes, punctuation);
```

All query functions are `const fn`. A static set specializes the matching work;
queries preserve the same membership and positions for all inputs. Whole-slice
queries handle partial tails without reading outside the supplied slice.

`find_from(bytes, start, set)` searches from `start` and returns a position in
the supplied input, or its length when absent. `prefix_end(bytes, start, set)`
returns the end of the matching run starting there. Both accept
`start <= bytes.length()`, including an
empty suffix. `find_where` and `prefix_where` use the same scans from zero.

## Floating execution

Floating arithmetic follows scalar `f32` execution per lane. Signed zeros compare
equal, NaN compares unequal to every value, and ordered comparisons with NaN are
false. Constant identity preserves floating bit patterns, including zero signs
and NaN representations. Static execution uses compiler-host arithmetic;
ordinary runtime arithmetic retains the target's floating environment. Identical
results across differing floating environments, NaN payload propagation, and
nondefault rounding modes are unspecified. Fused operations, approximations,
and floating horizontal reductions are not provided.
