---
title: "Own text and borrow sequences"
description: "Choose String or str, work with UTF-8, and understand when views prevent mutation."
section: learn
lesson: 6
source: docs/semantics.md
---

## Own the contents or borrow them

```carven
var title: String = "Carven";
title.append(" language");
let snapshot = title;
title.push('!');

println(snapshot);
println(title);
```

This prints `Carven language` and `Carven language!` on separate lines. A String copy owns independent bytes. A literal in a String annotation context constructs an owning value; an ordinary literal defaults to non-owning str.

Convert an existing str into an independent String with `text as String` or `String::from_str(text)`. A String can be borrowed in a str parameter context or explicitly with `.as_str()`.

## A borrow protects its source storage

The following example is a compile error:

```carven
var text: String = "hello";
let view = text.as_str();
text.append("!");
println(view);
```

view points to text's backing and prevents text from being modified while the view lives. Even moving println earlier does not end a named view's borrow: it lasts until the scope ends, rather than ending automatically at the last use. Put the view in a smaller branch scope or copy it into an owning String.

Self-append, `text.append(text.as_str())`, also conflicts. First write `let copy = text;`, then `text.append(copy);` so the input has independent storage.

## UTF-8 bytes and characters

```carven
let text = "A我";
println(text.len());

for scalar in text.chars {
    println(scalar);
}

let bytes = text.bytes;
for index in 0..text.len() {
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

len counts UTF-8 bytes and returns usize; chars decodes Unicode scalars; bytes is a read-only `[u8]` view of the same storage. The range `0..text.len()` takes its type from the length, so it is `range<usize>` and indexes the byte view without a cast or a `0usize` suffix. String has no direct indexing or direct iteration: select bytes or chars explicitly. str/String can contain interior NUL; NUL does not determine text length.

## Array slices

```carven
fn sum(values: [i32]) -> i32 {
    var result = 0;

    for value in values {
        result += value;
    }

    return result;
}

let values = [2, 4, 6];
let middle = values.as_slice().slice(1, 3);
println(sum(values), sum(middle));
```

The output is `12 10`. Arrays borrow automatically in slice argument context without copying elements. The half-open slice bounds are usize; unsuffixed literals such as `1` and `3` take that type from the parameter. The view is read-only and protects the whole backing. A view of a local array cannot be returned because it would escape its source lifetime.

A byte view is an ordinary slice, so the same operations apply to text: `text.bytes.slice(1, text.len())` selects the three bytes of 我 from `"A我"`, and `for byte in text.bytes` visits each byte.

## Exercise

Change the second valid text example to three characters. Record its byte length and the number of chars iterations. Change the array slice to `slice(3, 3)`; `sum(middle)` should be 0, so the complete output is `12 0`.
