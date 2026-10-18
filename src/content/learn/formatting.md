---
title: "Format and print results"
description: "Build readable output with interpolation, format specifications, and in-place append."
section: learn
lesson: 8
source: docs/language/text.md
---

## Print values directly

Write results to standard output and status information to standard error:

```carven run
println("quantity", 3, true);
println();
eprintln("status", "ready");
```

stdout contains `quantity 3 true` followed by a blank line. stderr contains `status ready`. `println` separates adjacent arguments with spaces and adds a newline; eprintln writes to stderr. print/eprint do not add a newline. Text is not a format string: `println("{count}", 3)` prints the braces literally.

## Control formatting with interpolation

```carven run
let id = 42;
let amount = 12.5;
let message = f"Order {id:04}: {amount:.2f}";
println(message);
```

The output is `Order 0042: 12.50`. Interpolation produces an independent `String`, and numeric holes can contain ordinary calculations. `:04` specifies width and zero padding; `:.2f` formats a floating value with two decimal places. Write literal braces as `{{` and `}}`.

## Append to an existing `String`

```carven run
var report: String = {};

for index in 0..3 {
    report.append_format(f"[{index}]");
}

println(report);
```

The output is `[0][1][2]`. `{}` constructs an empty `String` from the annotated type. append_format writes the formatted result directly into report and requires an f literal at the call. Passing an existing `String` variable does not satisfy this method's syntax; use append for ordinary text.

## Interpolation evaluation and value reads

Holes are evaluated once each, left to right, before formatting. Scalar values are saved at their hole positions. A `String` Read retains its owner, so formatting reads its contents after every hole has been evaluated. Avoid hiding mutations of one object across several holes: use statements to make copies and mutation order explicit.

append_format inputs cannot borrow the append target itself. A length query returns an independent `usize`, so `report.append_format(f"{report.byte_length()}")` is valid. `report.append_format(f"{report}")` conflicts with the target borrow.

## Exercise

Format each report integer as two hexadecimal digits, such as `[00][01][02]`. Print text containing NUL with `println`. A terminal may not display the NUL, but it remains part of the text and its length.
