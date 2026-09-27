---
title: "拥有文本与借用序列"
description: 选择 String 或 str，处理 UTF-8，并理解视图何时阻止修改。
section: learn
lesson: 6
source: docs/semantics.md
---

## 拥有内容还是借用内容

```carven
var title: String = "Carven";
title.append(" language");
let snapshot = title;
title.push('!');

println(snapshot);
println(title);
```

输出两行 `Carven language` 和 `Carven language!`。String 拷贝拥有独立字节，字面量在 String 注解上下文中构造拥有值。普通字面量默认是非拥有 str。

已有 str 变成独立 String 要写 `text as String` 或 `String::from_str(text)`。String 在 str 参数上下文可借用，或显式 `.as_str()`。

## 借用保护原存储

下面是一个编译错误例子：

```carven
var text: String = "hello";
let view = text.as_str();
text.append("!");
println(view);
```

view 借用 text 的底层存储；借用存在期间，text 不能修改。即使把 println 提前，命名视图的借用仍持续到作用域结束；最后一次使用不会自动结束它的借用。可以把视图使用放进更小的分支作用域，或复制文本，得到独立拥有内容的 String。

自追加 `text.append(text.as_str())` 同样会冲突。先写 `let copy = text;`，再 `text.append(copy);`，追加输入便是独立存储。

## UTF-8 字节与字符

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

输出：

```text
4
A
我
0 65
1 230
2 136
3 145
```

len 数 UTF-8 字节，返回 usize；chars 解码 Unicode 标量；bytes 是同一存储上的只读 `[u8]` 视图。范围 `0..text.len()` 的类型由长度决定，是 `range<usize>`，因此可以直接索引字节视图，不需要转换，也不必写 `0usize`。没有 String 的直接索引或直接迭代，应明确使用 bytes 或 chars。str/String 可包含内部 NUL，文本长度不由 NUL 决定。

## 数组切片

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

输出 `12 10`。数组在切片实参上下文自动借用，不复制元素。slice 的半开边界为 usize；`1`、`3` 这样不带后缀的字面量从参数得到这个类型。视图只读，借用整个底层数组。不能返回指向局部数组的视图，因为函数返回后该数组不再存活。

字节视图就是普通切片，同样的操作也适用于文本：`text.bytes.slice(1, text.len())` 从 `"A我"` 中选出“我”的三个字节，`for byte in text.bytes` 逐个访问字节。

## 练习

把第二个有效文本例子改成三个字符，分别记录字节数与 chars 迭代次数。把数组的 slice 改成 `slice(3, 3)`，`sum(middle)` 应为 0，整行输出为 `12 0`。
