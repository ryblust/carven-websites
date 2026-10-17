---
title: 字符、str 与 String
description: UTF-8、拥有文本、视图转换、修改限制与借用生命周期。
section: reference
lesson: 14
source: docs/language/text.md
---

## 字符与 UTF-8 视图

需要独立拥有文本时用 String，只读取已有文本且不复制时用 str，两者都使用 UTF-8。char 表示一个 Unicode 标量，也就是排除代理项的一个码点；它不一定对应一个完整的屏幕显示符号。char 不可变且可复制。支持相等、不等和模式匹配；不支持算术、排序、truthiness 或隐式数字转换。`as u32` 得到标量编号。

`str` 是按值传递的不可变 UTF-8 视图，由地址和字节长度表示。长度包括内部 NUL，不保证尾部 NUL。它不拥有存储，没有 `&str` 引用类型或源级 lifetime 标注。后备存储 可来自静态字面量、`String` 借用或外部存储；复制保留已知关系。

## 字符串字面量与多行布局

| 种类 | 单行     | 多行         | 转义 | 插值 |
| ---- | -------- | ------------ | ---- | ---- |
| 普通 | `"..."`  | `"""..."""`  | 是   | 否   |
| 原始 | `r"..."` | `r"""..."""` | 否   | 否   |
| 插值 | `f"..."` | `f"""..."""` | 是   | 是   |

普通和原始字面量产生具有程序寿命存储的 str。多行插值产生 String，求值与所有权规则和单行插值相同。前缀必须紧贴定界符；其他位置的 r、f 仍是标识符，原始与插值前缀不能组合。C 字符串仍是无内部 NUL、处理转义的单行形式。

原始字符串逐字保留反斜线和花括号。定界符可增加零个或多个井号，例如 `r#"text"#`、`r#"""..."""#`。第一个与起始引号数和井号数匹配的完整结束序列关闭字面量，额外井号位于其外。

```carven
let path = r"C:\tools\bin\";
let json = r#"{"name": "{name}"}"#;
let text = """
    Hello
      Carven
    World
""";
println(text); // 分三行输出，Carven 前保留两个空格
```

多行示例的值恰好是 `"Hello\n  Carven\nWorld"`。多行开始标记之后必须立即接 LF 或 CRLF。结束标记另起一行，前面只允许空格或 tab；后面可接分号、逗号、右括号等普通代码。结束行的缩进不决定字符串的值。

布局规则如下：

1. 去掉开始换行、结束行缩进，以及紧邻结束行之前的换行（如果它不是开始换行）。更多空白正文行仍保留。
2. 在非空白正文行中找最长的公共空格/tab 前缀，按字符匹配，不按显示列数；空白行不参与决定前缀。
3. 从非空白行移除前缀；空白行只移除与前缀相符的开头字符，遇到不匹配或任一端结束就停止。其余空白和行尾空白保留。非空白行无缩进时，公共前缀为空。
4. 正文全为空白行时移除其空格/tab，保留分隔换行。零行或一行空白正文产生空文本，两行产生一个 LF。
5. 物理 LF/CRLF 归一化为 LF，文本中的单独 CR 非法。随后才解码转义与插值，它们产生的空白属于内容，不再作为缩进移除。

每个插值孔算作一个非空白内容单元；孔内代码、嵌套字符串、注释、格式说明和物理换行不参与外围布局。孔后的文本沿用同一逻辑正文行，直到文本换行。插入值保留自己的空白，不增减缩进。普通、原始和插值形式使用同一布局规则。转义的 tab 或空格可以表达内容缩进；不支持反斜线续行或相邻字面量隐式拼接。

## 未检查文本构造

`char::from_u32_unchecked(value: u32) -> char` 从合法 Unicode 标量构造字符；值必须不大于 U+10FFFF，且不属于 U+D800..U+DFFF。`str::from_utf8_unchecked(bytes: [u8]) -> str` 从合法 UTF-8 字节构造借用视图，不复制或分配，不延长存储寿命。两者都直接通过类型名调用，无需导入。

原生执行不验证内容，调用者必须满足前置条件；尚未验证的输入应使用 [UTF 标准库](/zh/reference/utf/)的检查函数。字符工厂也支持常量执行与解释执行，这两种执行会检查标量前置条件并在非法时诊断；这不是类型化失败。两种未检查构造都支持常量和解释执行；执行器也检查 UTF-8 前置条件，非法内容产生执行错误。普通借用关系与参数类型检查仍然适用。

## 文本查询

`str` 和 `String` 都提供：

| 表达式               | 含义                           |
| -------------------- | ------------------------------ |
| `text.byte_length()` | UTF-8 字节数，`usize`          |
| `text.is_empty()`    | 字节数是否为零                 |
| `text.bytes`         | 只读 `[u8]`                    |
| `text.chars`         | 解码为 `char` 的 Read 迭代范围 |

`bytes/chars` 是特定类型上的计算投影，不是通用属性机制。chars 视图类型不能手写，通过绑定或聚合组成推断，复制保留相同文本 view，每次 Read 遍历从头开始且游标独立。字节视图使用完整切片 API。按字节位置遍历可写 `0..text.byte_length()`：字面量端点取另一端点的类型，因此区间是 `Range<usize>`。用户结构体可有同名字段。

## `String` 的拥有语义

String 的默认绑定来自 std::core，遵循普通查找。模块声明可遮蔽类型名，运行时局部可遮蔽工厂限定符；用 `import std::core using String as Text;` 保留访问。`::String` 选择原生 C++ 名字。

`String` 拥有连续合法 UTF-8 字节，可含 NUL，不做归一化、大小写折叠或 BOM 移除。相等比较字节。容量、布局、地址稳定性、尾部 NUL 和分配次数没有源级保证。

| 操作                              | 访问和结果                     |
| --------------------------------- | ------------------------------ |
| `String {}`                       | 空 `String`                    |
| `String::from_str(text)`          | Read `str`，返回独立副本       |
| `s.byte_length()`、`s.is_empty()` | Read，O(1)                     |
| `s.as_str()`                      | Read，O(1) 借用，无分配或转码  |
| `s.append(text)`                  | Write 接收者、Read `str`，void |
| `s.append_format(f"...")`         | Write 接收者，格式化追加，void |
| `s.push(character)`               | Write，编码一个 `char`，void   |
| `s.clear()`                       | Write，void                    |

可变字段和元素可作 Write 接收者；临时值和 Read 参数不行。点调用提供接收者访问，普通实参继续遵守显式访问标记。工厂和方法必须直接调用，括号包裹直接调用可用；不能取为一等方法值。

## 转换、复制和借用

字面量默认 `str`；`String` 上下文中的字面量构造拥有值。已有 `str` 需 `as String` 或 `from_str` 复制。`String` 在 `str` 目标上下文中借用，与 `.as_str()` 相同；Write 参数仍要求槽位类型匹配。

```carven
var owner: String = "hello";
let copy = owner;          // 独立 String
let view = owner.as_str(); // 借用 str
```

`String` 复制拥有独立内容；Take 使整个源所有者不可用。Read `String` 参数引用调用者存储。String 与 str 可通过借用视图比较 UTF-8 字节，字符串字面量也接受 String 上下文。

没有 `String` 的字面量模式、直接索引、排序、truthiness、`+` 拼接、直接迭代或 C++ 容器成员访问。`String(...)`、非空 `String { ... }`、`String as str` 非法。

## 借用与修改

命名视图的借用持续到它被替换、Take 或离开作用域；最后一次使用不会提前结束借用。借用存在时源 `String` 不能修改、替换或 Take，也不能 Take 包含它的 所有者。字段和元素可以区分，未知索引可能与任何元素重叠。

Write 是非独占访问：可以建立 Write 别名或捕获，但实际写入仍受已有借用约束。原生 Write 调用算可能写入。即使 `clear` 或 `append` 不改变内容，也必须满足写权限。`s.append(s.as_str())` 非法，应先建立独立副本。

```carven
var text: String = "hello";
text = text.as_str() as String;
let snapshot = text;
text.append(snapshot);
```

右侧复制先完成，再写入赋值目标。临时视图保护后备存储到消费操作完成，涵盖后续实参求值；独立结果不再携带输入借用时可以结束临时借用。例如独立 `String` 副本与后续 Take 可以组合，直接视图与后续 Take 不可以。

返回 Read `String` 参数的视图，要求调用者后备存储活得足够久；局部 `String` 和 Take 参数的视图不能逃逸。把 `String::from_str("x").as_str()` 存为命名视图非法，立即消费可行。范围循环会保留头部求值产生的 `String` 所有者，到所有循环退出路径清理。

聚合可以同时有 `String` 和 `str` 字段，但不能保存指向自身 `String` 存储的视图。复制 `String` 字段产生独立内容，复制视图字段保留原始 referent。

## 失败载荷与文本有效性

失败结构体或枚举可以包含 `String`。throw 默认复制，显式 Take 才转移。原始失败载荷独立于复制的 catch 绑定保留借用，覆盖选择、守卫条件 和 rethrow；清理不得提前销毁 后备存储。handler 可复制文本为独立 `String`。

`char::from_u32_unchecked(u32)` 要求合法 Unicode 标量；`str::from_utf8_unchecked([u8])` 要求合法 UTF-8 并借用输入。两者是直接内建工厂，原生执行不验证内容。Carven 检查类型和已知借用，调用者保证前置条件。静态执行和解释执行在字符构造执行到时检查标量前置条件，非法值产生执行错误。未检查借用文本构造也受执行器内容检查与普通借用寿命规则约束。未验证输入请使用受检查的 UTF 库。

`String` 分配失败和长度不可表示时终止。

## 编译期执行中的文本

必需编译期执行支持 `String` 构造与修改、as_str、byte_length/is_empty、插值、字节视图与切片操作，以及字节循环。经 text.chars 的字符迭代、检查及未检查借用文本构造均可在静态阶段执行。完成的 String 常量保留拥有类型，显式 str 或字符视图保留不可变程序期内容。未检查标量构造可执行，并在执行时检查前置条件。

```carven
const fn count_spaces(text: str) -> usize {
    var count = 0usize;
    for byte in text.bytes {
        if byte == 0x20 {
            count += 1;
        }
    }
    return count;
}

const spaces = count_spaces("a b c");
for index in 0..spaces {
    println(index);
}
```

程序输出 `0` 和 `1`。区间 `0..spaces` 是 `Range<usize>`，因为无后缀字面量取另一端点的类型。编译期执行会检查字节地址是否仍存活，见[指针](/zh/reference/pointers/#存活检查)。

C 字符串字面量 `c"..."` 是原生 `const char*` 值，不是 `str`。在编译期执行中，它们可以初始化常量、在函数间传递，也可以复制、赋值和 Take；冻结时保留其字节和指针类型。常量执行和解释器在打印与默认文本格式化时读取保留的字节。不支持指针比较、观察地址和 C 字符串字面量模式；见 [C 字符串](/zh/reference/interop/#c-字符串)。

## 检查文本构造

`char::from_u32(value: u32) -> char throw UnicodeScalarError` 拒绝 surrogate 及大于 U+10FFFF 的值，失败载荷为 UnicodeScalarError { value }。`str::from_utf8(bytes: [u8]) -> str throw UTF8Error` 检查完整字节切片并借用原存储，空输入合法；要独立拥有内容，结果用 as String。

调用并传播无需导入错误类型；命名 UnicodeScalarError、UTF8Error 或 UTF8ErrorKind 时从 std::utf 导入。UTF 失败携带被拒绝字节和序列起点的零基偏移，EOF 截断指向输入末尾，kind 为 InvalidLead、InvalidContinuation、Overlong、Surrogate、TooLarge 或 Truncated。两种检查构造支持静态与普通执行，借用不延长来源寿命。
