---
title: "拥有文本与借用序列"
description: 选择 `String` 或 `str`，处理 UTF-8，并理解视图何时阻止修改。
section: learn
lesson: 7
source: docs/language/text.md
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

输出两行 `Carven language` 和 `Carven language!`。`String` 拷贝拥有独立字节，字面量在 `String` 注解上下文中构造拥有值。普通字面量默认是非拥有 `str`。

已有 `str` 变成独立 `String` 要写 `text as String` 或 `String::from_str(text)`。`String` 在 `str` 参数上下文可借用，或显式 `.as_str()`。

## 写字面文本与多行文本

将这个独立程序保存为 literals.cv：

```carven
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

输出：

```text
C:\tools\bin\
{"name": "{name}"}
Hello
  Carven
World
```

原始字符串 `r"..."` 原样保留反斜杠与花括号。配对的 `#` 定界符让内容可以包含引号。多行文本使用三引号，正文从下一行开始。闭定界符须另起一行，前面只能有空格或制表符，后面可以接 `;` 等标点。Carven 移除非空正文行共有的缩进，也移除开头与结尾的换行。源码中的 CRLF 换行会变成 LF。闭定界符所在行的缩进不决定内容缩进。

普通与原始字面量产生 `str`，在 `String` 上下文中则构造自有文本。下一章会介绍插值，包括多行的 `f"""..."""` 文本。不支持原始插值或 `rf` 等组合前缀。空白行、制表符与定界符细节见[文本参考](/zh/reference/text/)。

## 借用保护原存储

下面是一个编译错误例子：

```carven
var text: String = "hello";
let view = text.as_str();
text.append("!");
println(view);
```

view 借用 text 的底层存储；借用存在期间，text 不能修改。把 println 提前也不会解除借用。命名视图的借用会持续到作用域结束，不会在最后一次使用后自动结束。可以把视图使用放进更小的分支作用域，或复制文本，得到独立拥有内容的 `String`。

自追加 `text.append(text.as_str())` 同样会冲突。先写 `let copy = text;`，再 `text.append(copy);`，追加输入便是独立存储。

## UTF-8 字节与字符

```carven
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

byte_length 数 UTF-8 字节，返回 `usize`；chars 解码 Unicode 标量；bytes 是同一存储上的只读 `[u8]` 视图。范围 `0..text.byte_length()` 的类型由长度决定，是 `Range<usize>`，因此可以直接索引字节视图，不需要转换，也不必写 `0usize`。没有 `String` 的直接索引或直接迭代，应明确使用 bytes 或 chars。`str`/`String` 可包含内部 NUL，文本长度不由 NUL 决定。

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
let middle = values.slice(1, 3);
println(sum(values), sum(middle));
```

输出 `12 10`。数组在切片实参上下文自动借用，不复制元素。slice 的半开边界为 `usize`；`1`、`3` 这样不带后缀的字面量从参数得到这个类型。视图只读取选中的元素，不复制它们。它存在时，原数组必须保持存活且不能修改。返回局部数组的视图会让调用者访问已经销毁的数据，因此编译器会拒绝。

字节视图就是普通切片，同样的操作也适用于文本：`text.bytes.slice(1, text.byte_length())` 从 `"A我"` 中选出“我”的三个字节，`for byte in text.bytes` 逐个访问字节。

## 拆成独立拥有的文本字段

报告可能是一整段 String，但接下来要逐行保留和处理。标准库的 lines 函数为这些行创建独立 String：

```carven
import std::utf using lines;

let result = lines("alpha\n\ngamma\n");
println(result.length(), result[0], result[2]);
println(result[1].is_empty());
```

先输出 `3 alpha gamma`，再输出 `true`。空行被保留，末尾换行不会额外增加一行。每条结果自己保存文本，因此集合不依赖原输入继续存活。import 从标准 UTF 模块选择 lines；模块章节会解释这条语法。

处理其他分隔符时可以用 split。它可能报告分隔符不合法，需要后面失败处理章节的语法。要在复制集合与借用子串之间选择，可查阅[UTF 参考](/zh/reference/utf/)。

## 练习

把第二个有效文本例子改成三个字符，分别记录字节数与 chars 迭代次数。把数组的 slice 改成 `slice(3, 3)`，`sum(middle)` 应为 0，整行输出为 `12 0`。
