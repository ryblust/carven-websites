---
title: 字符、str 与 String
description: UTF-8、拥有文本、视图转换、修改限制与借用生命周期。
section: reference
lesson: 10
source: docs/semantics.md
---

## 字符与 UTF-8 视图

`char` 是一个不可变、可复制的 Unicode 标量。支持相等、不等和模式匹配；不支持算术、排序、truthiness 或隐式数字转换。`as u32` 得到标量编号。

`str` 是按值传递的不可变 UTF-8 视图，由地址和字节长度表示。长度包括内部 NUL，不保证尾部 NUL。它不拥有存储，没有 `&str` 引用类型或源级 lifetime 标注。backing 可来自静态字面量、String 借用或外部存储；复制保留已知关系。

## 文本查询

str 和 String 都提供：

| 表达式            | 含义                         |
| ----------------- | ---------------------------- |
| `text.len()`      | UTF-8 字节数，usize          |
| `text.is_empty()` | 字节数是否为零               |
| `text.bytes`      | 只读 `[u8]`                  |
| `text.chars`      | 解码为 char 的 Read 迭代范围 |

`bytes/chars` 是特定类型上的计算投影，不是通用属性机制。chars 视图类型不能手写，只支持推断绑定和 Read 范围迭代。字节视图使用完整切片 API。用户结构体可有同名字段。

## String 的拥有语义

String 无需导入。无前缀的类型和工厂限定符 `String` 优先选择内建类型；普通值查找不变，`::String` 选择 C++ 名字。

String 拥有连续合法 UTF-8 字节，可含 NUL，不做归一化、大小写折叠或 BOM 移除。相等比较字节。容量、布局、地址稳定性、尾部 NUL 和分配次数没有源级保证。

| 操作                      | 访问和结果                     |
| ------------------------- | ------------------------------ |
| `String::new()`           | 空 String                      |
| `String::from_str(text)`  | Read str，返回独立副本         |
| `s.len()`、`s.is_empty()` | Read，O(1)                     |
| `s.as_str()`              | Read，O(1) 借用，无分配或转码  |
| `s.append(text)`          | Write 接收者、Read str，void   |
| `s.append_format(f"...")` | Write 接收者，格式化追加，void |
| `s.push(character)`       | Write，编码一个 char，void     |
| `s.clear()`               | Write，void                    |

可变字段和元素可作 Write 接收者；临时值和 Read 参数不行。点调用提供接收者访问，普通实参继续遵守显式访问标记。工厂和方法必须直接调用，括号包裹直接调用可用；不能取为一等方法值。

## 转换、复制和借用

字面量默认 str；String 上下文中的字面量构造拥有值。已有 str 需 `as String` 或 `from_str` 复制。String 在 str 目标上下文中借用，与 `.as_str()` 相同；Write 参数仍要求槽位类型匹配。

```carven
var owner: String = "hello";
let copy = owner;          // 独立 String
let view = owner.as_str(); // 借用 str
```

String 复制拥有独立内容；Take 使整个源 owner 不可用。Read String 参数引用调用者存储。已有 str 与 String 之间的相等不隐式统一类型；右侧字符串字面量可接受左侧 String 上下文。

没有 String 的字面量模式、直接索引、排序、truthiness、`+` 拼接、直接迭代或 C++ 容器成员访问。`String(...)`、`String { ... }`、`String as str` 非法。

## 借用与修改

命名视图的借用持续到它被替换、Take 或离开作用域；最后一次使用不会提前结束借用。借用存在时源 String 不能修改、替换或 Take，也不能 Take 包含它的 owner。字段和元素可以区分，未知索引可能与任何元素重叠。

Write 是非独占访问：可以建立 Write 别名或捕获，但实际写入仍受已有借用约束。原生 Write 调用算可能写入。即使 `clear` 或 `append` 不改变内容，也必须满足写权限。`s.append(s.as_str())` 非法，应先建立独立副本。

```carven
var text: String = "hello";
text = text.as_str() as String;
let snapshot = text;
text.append(snapshot);
```

右侧复制先完成，再写入赋值目标。临时视图保护 backing 到消费操作完成，涵盖后续实参求值；独立结果不再携带输入借用时可以结束临时借用。例如独立 String 副本与后续 Take 可以组合，直接视图与后续 Take 不可以。

返回 Read String 参数的视图，要求调用者 backing 活得足够久；局部 String 和 Take 参数的视图不能逃逸。把 `String::from_str("x").as_str()` 存为命名视图非法，立即消费可行。范围循环会保留头部求值产生的 String owner，到所有循环退出路径清理。

聚合可以同时有 String 和 str 字段，但不能保存指向自身 String 存储的视图。复制 String 字段产生独立内容，复制视图字段保留原始 referent。

## 失败载荷与文本有效性

失败结构体或枚举可以包含 String。throw 默认复制，显式 Take 才转移。原始失败载荷独立于复制的 catch 绑定保留借用，覆盖选择、guard 和 rethrow；清理不得提前销毁 backing。handler 可复制文本为独立 String。

`char::from_u32_unchecked(u32)` 要求合法 Unicode 标量；`str::from_utf8_unchecked([u8])` 要求合法 UTF-8 并借用输入。两者是直接内建工厂，不验证内容。编译器检查类型和已知借用；调用者保证内容前置条件。未验证输入使用 UTF 库的检查接口。

String 分配失败和长度不可表示时终止。
