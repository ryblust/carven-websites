---
title: "文本存储与借用视图"
description: 选择 `String` 或 `str`，处理 UTF-8，并理解视图何时阻止修改。
section: learn
lesson: 7
source: docs/language/text.md
---

## 选择独立文本或借用视图

构造标题，保存副本，再扩展原文本。用 String 让两个值分别保存自己的文本：

```carven run
var title: String = "Carven";
title.append(" language");
let snapshot = title;
title.push('!');

println(snapshot);
println(title);
```

输出两行 `Carven language` 和 `Carven language!`。append 追加文本，push 追加一个字符；字符用单引号表示，如 `'!'`。复制 `String` 会得到独立的文本存储。类型注解为 `String` 时，字面量会构造 String；没有这个类型要求时，普通字面量默认为不管理底层存储的 `str`。

已有 `str` 变成独立 `String` 要写 `text as String` 或 `String::from_str(text)`。参数类型为 `str` 时，可以直接借用 `String`，也可以显式调用 `.as_str()`。

## 写字面文本与多行文本

将这个独立程序保存为 literals.cv：

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

输出：

```text
C:\tools\bin\
{"name": "{name}"}
Hello
  Carven
World
```

原始字符串 `r"..."` 原样保留反斜杠与花括号。配对的 `#` 定界符让内容可以包含引号。多行文本从起始三引号的下一行开始，结束定界符另起一行。Carven 移除共有缩进，以及开头与结尾的换行。

下一章会介绍插值。完整字面量与定界符规则见[文本参考](/zh/reference/text/)。

## 借用保护原存储

下面是一个编译错误例子：

```carven
var text: String = "hello";
let view = text.as_str();
text.append("!");
println(view);
```

view 借用 text 的底层存储；借用存在期间，text 不能修改。把 println 提前也不会解除借用。命名视图的借用会持续到作用域结束，不会在最后一次使用后自动结束。可以把视图使用放进更小的分支作用域，或复制文本，得到管理自己文本存储的 `String`。

要把文本追加到自身，先为输入创建独立副本，再修改目标。把下面代码作为独立程序运行，不保留错误示例中的视图：

```carven run
var text: String = "hello";
let copy = text;
text.append(copy);
println(text);
```

输出 `hellohello`。若直接把 `text.as_str()` 传给自身的 append，则会保留相冲突的借用。

## UTF-8 字节与字符

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

byte_length 计算 UTF-8 字节数，返回 `usize`；chars 解码 Unicode 标量；bytes 是同一存储上的只读 `[u8]` 视图。`String` 不支持直接索引或直接迭代，应明确使用 bytes 或 chars。`str`/`String` 可包含内部 NUL，文本长度不由 NUL 决定。

## 数组切片

`[i32]` 这样的切片借用一段元素，长度不写在类型里。先对整个数组求和，再用 slice(1, 3) 只选择索引 1、2 处的元素求和：

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

输出 `12 10`。参数类型为切片时，数组会自动借用为切片，不复制元素。slice 使用左闭右开的区间，两个端点的类型为 `usize`；`1`、`3` 这样不带后缀的字面量从参数得到这个类型。视图存在时，原数组必须保持存活且不能修改。返回局部数组的视图会让调用者访问已经销毁的数据，因此编译器会拒绝。

字节视图就是普通切片，同样的操作也适用于文本：`text.bytes.slice(1, text.byte_length())` 从 `"A我"` 中选出“我”的三个字节，`for byte in text.bytes` 逐个访问字节。

## 拆分为独立字符串

报告可能是一整段 String，但接下来要逐行保留和处理。标准库的 lines 函数为这些行创建独立 String：

```carven run
import std::utf using lines;

let result = lines("alpha\n\ngamma\n");
println(result.length(), result[0], result[2]);
println(result[1].is_empty());
```

先输出 `3 alpha gamma`，再输出 `true`。空行被保留，末尾换行不会额外增加一行。每条结果自己保存文本，因此集合不依赖原输入继续存活。import 从标准 UTF 模块选择 lines；模块章节会解释这条语法。

使用其他分隔符拆分文本或借用子串时，查阅[UTF 参考](/zh/reference/utf/)。

## 练习

在 UTF-8 示例中，把 `"A我"` 改成三个 Unicode 字符，分别记录字节数与 chars 迭代次数。把数组的 slice 改成 `slice(3, 3)`，`sum(middle)` 应为 0，整行输出为 `12 0`。
