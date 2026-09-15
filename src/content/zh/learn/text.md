---
title: 文本、切片与借用
description: 选择 String 或 str，处理 UTF-8，并理解视图何时阻止修改。
section: learn
lesson: 6
source: docs/semantics.md
---

## 拥有内容还是借用内容

```carven
fn main() {
    var title: String = "Carven";
    title.append(" language");
    let snapshot = title;
    title.push('!');

    println(snapshot);
    println(title);
}
```

输出两行 `Carven language` 和 `Carven language!`。String 拷贝拥有独立字节，字面量在 String 注解上下文中构造拥有值。普通字面量默认是非拥有 str。

已有 str 变成独立 String 要写 `text as String` 或 `String::from_str(text)`。String 在 str 参数上下文可借用，或显式 `.as_str()`。

## 借用保护原存储

下面是一个编译错误例子：

```carven
fn main() {
    var text: String = "hello";
    let view = text.as_str();
    text.append("!");
    println(view);
}
```

view 指向 text 的 backing，活着时阻止 text 修改。即使把 println 提前，命名 view 仍持续到作用域结束；最后一次使用不会自动结束它的借用。可以把视图使用放进更小的分支作用域，或直接复制成拥有 String。

自追加 `text.append(text.as_str())` 同样会冲突。先写 `let copy = text;`，再 `text.append(copy);`，追加输入便是独立存储。

## UTF-8 字节与字符

```carven
fn main() {
    let text = "A我";
    println(text.len());

    for scalar in text.chars {
        println(scalar);
    }

    println(text.bytes[0]);
}
```

输出 4、A、我、65，各一行。len 数 UTF-8 字节；chars 解码 Unicode 标量；bytes 是 `[u8]`。没有 String 的直接索引或直接迭代，应明确使用 bytes 或 chars。str/String 可包含内部 NUL，文本长度不由 NUL 决定。

## 数组切片

```carven
fn sum(values: [i32]) -> i32 {
    var result = 0;

    for value in values {
        result += value;
    }

    return result;
}

fn main() {
    let values = [2, 4, 6];
    let middle = values.as_slice().slice(1usize, 3usize);
    println(sum(values), sum(middle));
}
```

输出 `12 10`。数组在切片实参上下文自动借用，不复制元素。slice 的半开边界为 usize，视图只读，保护整个 backing。返回局部数组的视图会逃逸，不能这样返回。

## 练习

把第二个有效文本例子改成三个字符，分别记录字节数与 chars 迭代次数。把数组的 slice 改成 `slice(3usize, 3usize)`，sum 应为 0。
