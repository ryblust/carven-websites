---
title: "输入、输出与字节分帧"
description: "有界异步标准输入、结构化输出、UTF-8 错误与增量记录分帧。"
section: reference
lesson: 30
source: docs/language/io.md
---

std::io 用于向标准输出/错误流打印，以及从进程的标准输入读取字节、完整文本或逐行内容。打印是普通调用，读取返回需要 await 的异步操作。如果输入分成若干块到达，分帧工具负责把它们拼成完整记录。

## 能力与导入

输出函数与 `stdin` 默认可用；显式使用其他类型名字时从 `std::io` 导入。

| 能力                     | API                                      |
| ------------------------ | ---------------------------------------- |
| 标准输出与错误流         | `print`、`println`、`eprint`、`eprintln` |
| 异步标准输入             | `stdin`、`Stdin`、`Read<T>`、`IOError`   |
| 完整字节缓冲区中的行边界 | `ByteLines`、`LineBoundary`              |
| 增量有界字节记录         | `LineFramer`、`FrameError`               |

## 输出

输出函数接受一个或多个 Read 值，返回 `void`，按从左到右求值一次。`println()`、`eprintln()` 也可零实参写换行；`print`、`eprint` 至少一个实参。值之间有一个空格，带 ln 的函数追加换行。不能打印 `void` 或字符迭代视图。标量 Read 保存值，String Read 别名其所有者，文本视图在实参求值和打印期间保留后备存储。

文本原样输出，包括内嵌 NUL；`println("{value}", 3)` 输出 `{value} 3`。需要格式化时显式用 `println(f"{value:04}")`。标量遵循默认 C++ 格式，`char` 输出 UTF-8。

直接打印独立于插值格式协议。结构体显示源码类型名和声明顺序字段，枚举显示 `Type::Case` 与载荷，数组与切片显示方括号元素，范围显示边界与 `..` 或 `..=`。非空结构、序列与载荷使用每层四空格缩进的多行布局，各项后带逗号；空结构和序列为 `Type {}`、`[]`。

```text
Order {
    price: Money {
        cents: 1250,
    },
    names: [
        "a",
        "b",
    ],
}
```

嵌套文本用双引号并转义引号、反斜线、换行、CR、tab、NUL；嵌套字符用单引号。类只显示类型名。结构化显示不调用自定义 formatter、流插入运算符或 getter；`println(f"{value}")` 则先显式格式化。

原生算术值按标量显示，`char32_t` 显示字符，其他 C++ 字符代码单元显示数值。`std::string_view` 和运行时 String 按文本处理。非空 C 字符串要求可读的 NUL 结尾存储；其他可转 `const void*` 的指针显示地址或 `nullptr`；外部类型、函数指针和可调用值显示 `<opaque>`。

结构化输出最多展开八层（根为零）、每序列 64 项、16,384 UTF-8 字节，省略以 `...` 标记；断言解释也遵循这些限制，顶层原样文本不受这组结构化限制。它是诊断显示，不是序列化格式。

输出支持静态执行，立即写入编译器宿主；普通调用写入运行时流。声明函数不会执行它；可选预计算不会提前打印或移除必需的运行时输出。输出字节计入根的累计文本工作预算，后续失败不撤销已输出内容。缓冲与刷新遵循 C++ 标准库，不逐次额外 flush；原生格式或输出故障终止，不是类型化失败。

输出也可用期望签名适配为 可调用值，如 `let output: fn(str, i32) -> void = println;`。

## 标准输入

`stdin()` 与 `Stdin::new()` 创建等价输入句柄。句柄拥有配置；完成的读取拥有数据。`Read<T>` 是含 `Data(T)` 与无载荷 `End` 的普通泛型枚举。

| 操作                                  | 成功值                                       | 声明的失败 |
| ------------------------------------- | -------------------------------------------- | ---------- |
| `input.read(max_bytes: usize)`        | 至多指定字节的 `Read<Vector<u8>>`，或 `.End` | `IOError`  |
| `input.read_all(limit: usize)`        | 读到 EOF 的 `Vector<u8>`，可为空             | `IOError`  |
| `input.read_text(limit: usize)`       | 读到 EOF 并校验的拥有型 `String`             | `IOError`  |
| `input.read_line()`                   | 拥有行 `.Data(String)` 或 `.End`             | `IOError`  |
| `input.with_line_limit(limit: usize)` | 配置最大行内容字节数的新句柄                 | 无         |

读取是冷操作；构造或丢弃未启动读取不消耗输入。await 或启动子任务后执行，遵循异步取消、关闭和 timeout 契约，读取当前执行阶段的进程输入。

```carven
import std::io using IOError;

async fn main() throw IOError {
    let input = stdin().with_line_limit(4096);
    while {
        match await input.read_line()? {
            .Data(line) => println(line),
            .End => break,
        }
    }
}
```

行读取去除 LF 及紧邻其前的 CR。空行是 `.Data("")`，不同于 EOF；末尾无 LF 的行只返回一次。单独 CR 属于内容，行限制不含分隔符。默认行限制为可表示的字节范围；`read_all`、`read_text` 必须给最大字节数。零大小块读取不消耗输入，返回空 `.Data`。

字节读取保留 NUL 和无效 UTF-8。文本读取在完整字节序列上校验；字节在校验前已经消耗，包括失败时。编码错误保留种类、拒绝字节偏移和序列起点，按完成输入从零计字节，截断指向末尾。

`IOError` 为 `.System(i32)`、`.InputTooLarge(usize)`、`.InvalidUTF8(UTF8Error)`。在 `catch IOError(error)` 后匹配这些情况。字节读取不会产生编码错误，块读取不会产生大小限制错误。

所有句柄共享一个进程输入游标和缓冲区；已启动请求按先进先出注册顺序服务。预读字节跨模式保留。取消移除请求并保留未完整输入；超限保留输入，可扩大限制重试或用原始块恢复。缓冲可能在拒绝前额外预读一个原生块。

### 输入的执行阶段

输入工厂与读取支持 `const`，显式静态读取使用编译器进程输入，解释和原生读取用执行进程输入。构造句柄只配置，不读取；普通调用仍在运行时执行。静态根与随后同一进程中的解释共享预读、EOF 和系统错误。

显式限额失败是可捕获的 `IOError::InputTooLarge`；静态或解释值大小、聚合预算耗尽是不可捕获为 IOError 的执行限制。等待没有隐式实际时长上限。浏览器 Playground 提供空输入流，交互管线请本地运行。

## 字节分帧

分帧不校验 UTF-8。用 `str::from_utf8` 解码完整记录，便于逐条恢复，也能正确处理跨块的多字节字符。

`ByteLines::new()` 创建偏移游标，`cursor.next(bytes)` 遍历固定缓冲区。`LineBoundary::Line(start, end, terminated)` 指出不含 LF 的字节区间及是否有 LF，CR 仍在区间内；`End` 为结束。空输入和末尾 LF 不生成额外记录，一次遍历保持同一缓冲区。

`LineFramer::new(limit, strip_cr)` 拥有未完成记录。`feed(bytes)?` 返回每个已完成 LF 记录的独立字节 Vector，包括空记录。limit 计 LF 前字节，也包含可能的 CR；`strip_cr` 为 true 时移除 LF 前 CR，EOF 处单独 CR 保留。允许任意块切分。

`finish(allow_partial)?` 封闭该次分帧，返回 `.End` 或一个剩余 `.Data`。不允许未结束记录时报告 `FrameError::Truncated`；超长为 `TooLong(limit)` 并封闭。先前返回的记录独立，失败的 feed 调用内记录不交付；封闭后再调用报告 `Finished`。零限制接受空 LF 记录。所有分帧方法均支持静态执行。
