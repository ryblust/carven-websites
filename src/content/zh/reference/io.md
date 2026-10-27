---
title: "输入、输出与分帧"
description: "有界异步标准输入、结构化输出、UTF-8 错误与增量记录分帧。"
section: reference
lesson: 29
source: docs/language/io.md
---

`std::io` 用于向标准输出/错误流打印，以及从进程的标准输入读取字节、完整文本或逐行内容。打印是普通调用，读取返回需要 await 的异步操作。如果输入分成若干块到达，分帧工具负责把它们拼成完整记录。

## 能力与导入

输出函数与 `stdin` 默认可用；显式使用其他类型名字时从 `std::io` 导入。

| 能力                     | API                                          |
| ------------------------ | -------------------------------------------- |
| 标准输出与错误流         | `print`、`println`、`eprint`、`eprintln`     |
| 异步标准输入             | `stdin`、`Stdin`、`ReadResult<T>`、`IOError` |
| 完整字节缓冲区中的行边界 | `ByteLines`、`LineBoundary`                  |
| 增量有界字节记录         | `LineFramer`、`LineFrameError`               |

## 输出

打印函数 `print`、`println`、`eprint`、`eprintln` 的完整规则见[打印](/zh/reference/formatting/#打印)；复合值的显示方式见[结构化打印](/zh/reference/formatting/#结构化打印)。

```carven run
println("answer", 42); // answer 42
println(f"hex: {42:04x}"); // hex: 002a
eprintln("status", "ready"); // 写入 stderr。
```

## 输入与分帧类型

显式命名下列源码声明时，从 `std::io` 导入。这些类型名没有默认绑定；源码函数 `stdin` 默认可见。

| 类型             | 契约                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| `ReadResult<T>`  | 载荷枚举：`Data(T)` 或无载荷 `End`                                                                                   |
| `IOError`        | 载荷枚举：`System(i32)`、`InputTooLarge(usize)`、`InvalidUTF8(UTF8Error)`；命名 `UTF8Error` 类型时从 `std::utf` 导入 |
| `LineBoundary`   | 载荷枚举：`Line(usize, usize, bool)` 或无载荷 `End`，分别为起点、不含末端的结束位置及是否含 LF                       |
| `LineFrameError` | 载荷枚举：`TooLong(usize)`、`Truncated`、`Finished`，`TooLong` 携带配置的限制                                        |
| `CarriageReturn` | 数值枚举：`Preserve` 或 `Strip`，控制 LF 前的 CR                                                                     |
| `IncompleteLine` | 数值枚举：`Return` 或 `Reject`，控制 EOF 处未结束的记录                                                              |
| `Stdin`          | 保存输入配置的类，方法见下文                                                                                         |
| `ByteLines`      | 保存遍历偏移的类，方法见[字节分帧](#字节分帧)                                                                        |
| `LineFramer`     | 拥有未完成字节记录的类，方法见[字节分帧](#字节分帧)                                                                  |

## 标准输入

`stdin()` 与 `Stdin::new()` 创建等价的配置句柄。读取完成后，返回值拥有读取的数据。

| 操作                                         | 成功值                                             | 声明的失败 |
| -------------------------------------------- | -------------------------------------------------- | ---------- |
| `Stdin::new() -> Stdin` / `stdin() -> Stdin` | 默认输入配置                                       | 无         |
| `input.read(max_bytes: usize)`               | 至多指定字节的 `ReadResult<Vector<u8>>`，或 `.End` | `IOError`  |
| `input.read_all(limit: usize)`               | 读到 EOF 的 `Vector<u8>`，可为空                   | `IOError`  |
| `input.read_text(limit: usize)`              | 读到 EOF 并校验 UTF-8 后返回独立的 `String`        | `IOError`  |
| `input.read_line()`                          | 拥有独立行数据的 `.Data(String)` 或 `.End`         | `IOError`  |
| `input.with_line_limit(limit: usize)`        | 配置最大行内容字节数的新句柄                       | 无         |

所有方法使用 Read 接收者。`with_line_limit` 复制配置并返回 `Stdin`，不修改原句柄。四个读取方法是返回 `Operation<Success, throw IOError>` 的同步工厂，其中 `Success` 为表中的成功结果类型。构造本身没有类型化失败，`IOError` 在操作执行时交付。

构造或丢弃未启动的读取不消耗输入。await 或启动子任务后才读取当前进程的输入，并遵循[异步生命周期与取消规则](/zh/reference/async/)。

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

字节读取保留 NUL 和无效 UTF-8。文本读取在消耗完整字节序列后校验，失败时也不退回这些字节。[UTF8Error](/zh/reference/utf/#失败位置与流协议)中的位置相对于这次读取所得的数据。

`IOError::System(i32)` 携带平台错误码，`InputTooLarge(usize)` 携带本次读取的字节限制，`InvalidUTF8(UTF8Error)` 携带编码错误。在 `catch IOError(error)` 后匹配这些情况。字节读取不会产生编码错误，块读取不会产生大小限制错误。

同一运行时实例内的句柄共享一个输入游标和缓冲区；已启动的请求按注册顺序处理。预读字节跨模式保留。取消会移除请求，并保留缓冲区中尚未完成的输入；超限保留输入，可扩大限制重试或用原始块恢复。缓冲可能在拒绝前额外预读一个原生块。

### 输入的执行阶段

输入工厂与读取支持 `const`，显式静态读取使用编译器进程输入，解释和原生读取用执行进程输入。构造句柄只配置，不读取；普通调用仍在运行时执行。编译期执行与随后同一进程中的解释执行共享预读字节、EOF 状态和系统错误。

超出显式设置的输入限制会产生可捕获的 `IOError::InputTooLarge`。静态执行或解释执行中，值大小或聚合存储预算耗尽属于执行限制，不能作为 IOError 捕获。等待没有隐含的超时。浏览器 Playground 提供空输入流，需要交互输入的程序请在本地运行。

## 字节分帧

| 调用                                                             | 访问         | 结果                     | 失败                   |
| ---------------------------------------------------------------- | ------------ | ------------------------ | ---------------------- |
| `ByteLines::new()`                                               | 关联函数     | `ByteLines`              | 无                     |
| `cursor.next(bytes: [u8])`                                       | Write 游标   | `LineBoundary`           | 无；无效游标偏移会终止 |
| `LineFramer::new(limit: usize, carriage_return: CarriageReturn)` | 关联函数     | `LineFramer`             | 无                     |
| `framer.feed(bytes: [u8])`                                       | Write 分帧器 | `Vector<Vector<u8>>`     | `LineFrameError`       |
| `framer.finish(incomplete: IncompleteLine)`                      | Write 分帧器 | `ReadResult<Vector<u8>>` | `LineFrameError`       |

这些函数和方法均为 `const fn`。`ByteLines` 不保存输入，副本从复制的偏移独立遍历；`LineFramer` 副本独立拥有未完成字节与分帧状态。

分帧不校验 UTF-8。用 `str::from_utf8` 解码完整记录，便于逐条恢复，也能正确处理跨块的多字节字符。

`ByteLines::new()` 创建偏移游标，`cursor.next(bytes)` 遍历固定缓冲区。`LineBoundary::Line(start, end, terminated)` 指出不含 LF 的字节区间及是否有 LF，CR 仍在区间内；`End` 为结束。空输入和末尾 LF 不生成额外记录，一次遍历保持同一缓冲区。

`LineFramer::new(limit, carriage_return: CarriageReturn)` 拥有未完成记录。`feed(bytes)?` 返回每个已完成 LF 记录的独立字节向量，包括空记录。`limit` 计 LF 前的字节，也包含可能的 CR；`CarriageReturn::Strip` 移除 LF 前的 CR，`Preserve` 则保留它。EOF 处单独的 CR 属于内容。允许任意块切分。

`finish(incomplete: IncompleteLine)?` 结束该次分帧，返回 `.End` 或一个剩余 `.Data`。`IncompleteLine::Return` 返回未结束的记录，`Reject` 则报告 `LineFrameError::Truncated`；记录超长时报告 `TooLong(limit)`，并结束该次分帧。先前返回的记录不受影响；失败的 feed 调用不会返回其中任何记录。结束后再次调用 feed 或 finish 会报告 `Finished`。零限制接受空 LF 记录。所有分帧方法均支持静态执行。

## 异步协议输出

同步协议输出使用 `write_stdout(text: str) -> void throw IOError`，原样写出文本并在返回前刷新。该函数为 `const fn`，系统失败报告为 `IOError::System(code)`。从 `std::io` 显式导入，它没有默认绑定。

`write_stdout_async(&&bytes)` 返回冷操作，把全部字节写入 `stdout`，系统失败抛 `IOError::System(code)`。操作等待输出就绪时保留拥有型向量，使其他任务可在管道背压下继续。一次只允许一个活动写入，并发写报告系统忙；用写入任务和有界通道串行提交消息。

取消停止后续写入，已写前缀保留在流中。POSIX 提供者暂时启用非阻塞 `stdout`，结束或取消后恢复原标志。Windows 同步标准句柄使用可取消原生写入，直到完成或取消结束才释放缓冲。活动期间不要混用缓冲打印、`write_stdout` 或外部写入。
