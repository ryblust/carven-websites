---
title: "Own text and borrow sequences"
description: "Choose `String` or `str`, work with UTF-8, and understand when views prevent mutation."
section: learn
lesson: 7
source: docs/language/text.md
---

## Own the contents or borrow them

Build a title, save a copy, then extend the original. Use `String` to give each value its own text storage:

```carven run
var title: String = "Carven";
title.append(" language");
let snapshot = title;
title.push('!');

println(snapshot);
println(title);
```

This prints `Carven language` and `Carven language!` on separate lines. append adds text; push adds one character, written with single quotes as in `'!'`. A `String` copy owns independent bytes. A literal in a `String` annotation context constructs an owning value; an ordinary literal defaults to non-owning `str`.

Convert an existing `str` into an independent `String` with `text as String` or `String::from_str(text)`. A `String` can be borrowed in a `str` parameter context or explicitly with `.as_str()`.

## Write literal text and multiple lines

Save this separate program as literals.cv:

```carven run
let path = r"C:\tools\bin\";
let quoted = r#"{"name": "{name}"}"#;
let message = """
    Hello
      Carven
    World
""";

println(path);
println(quoted);
println(message);
```

The output is:

```text
C:\tools\bin\
{"name": "{name}"}
Hello
  Carven
World
```

Raw `r"..."` preserves backslashes and braces. Matching `#` delimiters allow quotes inside raw text. For multiline text, start the text after the opening triple quotes and put the closing delimiter on its own line. Carven removes common indentation and the opening and final line endings.

The next chapter introduces interpolation. See the [text reference](/reference/text/) for the complete literal and delimiter rules.

## A borrow protects its source storage

The following example is a compile error:

```carven
var text: String = "hello";
let view = text.as_str();
text.append("!");
println(view);
```

view points to text's backing and prevents text from being modified while the view lives. Moving `println` earlier does not release the borrow. A named view keeps its borrow until its scope ends, even after its last use. Put the view in a smaller branch scope or copy it into an owning `String`.

For self-append, give the input independent storage before modifying the target. Run this as a separate program, without the live view from the error example:

```carven run
var text: String = "hello";
let copy = text;
text.append(copy);
println(text);
```

This prints `hellohello`. Passing `text.as_str()` directly to its own append would retain a conflicting borrow.

## UTF-8 bytes and characters

```carven run
let text = "A我";
println(text.byte_length());

for scalar in text.chars {
    println(scalar);
}

let bytes = text.bytes;
for index in 0..text.byte_length() {
    println(index, bytes[index]);
}
```

The output is:

```text
4
A
我
0 65
1 230
2 136
3 145
```

byte_length counts UTF-8 bytes and returns `usize`; chars decodes Unicode scalars; bytes is a read-only `[u8]` view of the same storage. `String` has no direct indexing or direct iteration: select bytes or chars explicitly. `str`/`String` can contain interior NUL; NUL does not determine text length.

## Array slices

A slice such as `[i32]` borrows a sequence of elements without fixing its length in the type. Sum the whole array, then use slice(1, 3) to sum only the elements at indices 1 and 2:

```carven run
fn sum(values: [i32]) -> i32 {
    var result = 0;

    for value in values {
        result += value;
    }

    return result;
}

let values = [2, 4, 6];
let middle = values.slice(1, 3);
println(sum(values), sum(middle));
```

The output is `12 10`. Arrays borrow automatically in slice argument context without copying elements. The half-open slice bounds are `usize`; unsuffixed literals such as `1` and `3` take that type from the parameter. While the view exists, keep the original array alive and unchanged. Returning a view of a local array would leave the caller looking at data that has already been destroyed, so the compiler rejects it.

A byte view is an ordinary slice, so the same operations apply to text: `text.bytes.slice(1, text.byte_length())` selects the three bytes of 我 from `"A我"`, and `for byte in text.bytes` visits each byte.

## Split text into independent owned fields

A report may arrive as one `String`, while its lines need to be kept and processed separately. The standard lines function makes independent Strings for those lines:

```carven run
import std::utf using lines;

let result = lines("alpha\n\ngamma\n");
println(result.length(), result[0], result[2]);
println(result[1].is_empty());
```

This prints `3 alpha gamma`, then `true`. The empty line is kept, and a final newline does not add an extra line. Each result owns its text, so the collection does not depend on the original input staying alive. The import selects lines from the standard UTF module; the modules chapter explains that syntax.

See the [UTF reference](/reference/utf/) for splitting on other separators and borrowing substrings.

## Exercise

In the UTF-8 example, replace `"A我"` with three Unicode characters. Record its byte length and the number of chars iterations. Change the array slice to `slice(3, 3)`; `sum(middle)` should be 0, so the complete output is `12 0`.
