---
title: "项目：语言服务器"
description: 应用 JSON 文档修改，异步运行分析，返回诊断，再关闭 carven-lsp 会话。
section: learn
lesson: 20
source: tools/lsp/README.md
---

## 准备项目

语言服务器接收编辑器的文档修改，在继续接收消息的同时分析新文本，再返回诊断。用户修复代码后，服务器发送空诊断数组清除错误；关闭时，写完排队的回复并结束会话中的任务。

`carven-lsp` 用 Carven 实现这条流程，独立的 `carven-analyzer` 进程提供编译器分析。用 JSON 读取和构造消息，用 Async 协调输入与分析，用管理自己数据的值在这些步骤之间传递文本。

先完成[异步工作流](/zh/learn/async/)和 [JSON 输入项目](/zh/learn/data-pipeline/)，按[第一个程序](/zh/learn/first-program/)准备 `carven`。下方的独立编辑示例只需要编译器和一份 `protocol.cv`。修改完整服务器时，在 POSIX 系统中获取[语言服务器项目](https://github.com/ryblust/carven/tree/main/tools/lsp)，按项目说明完成构建与测试。协议测试需要 Node.js 24.12 或更新版本，以及 pnpm。

运行完整服务器时，先确保终端可以调用 `carven-lsp`，再显式指定分析器路径启动：

```sh
carven-lsp --analyzer /absolute/path/to/carven-analyzer
```

编辑器也配置为使用同一个可执行文件和参数。也可以把 `carven-analyzer` 加入 PATH，省略 `--analyzer`。服务器通过标准输入和标准输出交换经过分帧的消息。

先运行下面的小型文档修改程序。后续步骤打开已有应用的 `tools/lsp/main.cv`：main 连接子操作，analyze 处理任务，由消息循环把修改送去分析并发布诊断。每一步都有可以检查的结果。

## 用 JSON 修改文档

先把编辑器消息变成新的文档文本。用结构体保存 URI、文本和编辑器版本，通过 `&document` 修改状态。在全部修改成功之前，先把新文本保存在局部变量中。

新建一个独立练习目录，把项目中的 `tools/lsp/protocol.cv` 按相同的相对路径复制到其中，再将下面的完整程序保存为与 `tools/` 同级的 `document_edit.cv`。其中的 `apply_change` 函数同时支持全文替换和 UTF-16 范围修改：

```carven
import tools.lsp.protocol using { apply_change, ProtocolError };
import std::json using { Value, JSONError, ValueError };

struct Document {
    uri: String,
    text: String,
    version: i64,
}

fn apply_notification(&document: Document, message: Value) throw ValueError + ProtocolError {
    let params = message.get("params")?;
    let target = params.get("textDocument")?;
    let uri = target.get("uri")?;
    if uri.as_str()? != document.uri { throw ProtocolError::InvalidParams; }

    let version = target.get("version")?;
    let next_version = version.as_i64()?;
    if next_version <= document.version { return; }

    let changes = params.get("contentChanges")?;
    if changes.length()? == 0 { return; }
    var text = document.text;
    for index in 0..changes.length()? {
        text = apply_change(text.as_str(), changes.at(index)?)?;
    }

    document.text = &&text;
    document.version = next_version;
}

var document = Document {
    uri: "untitled:demo.cv",
    text: "fn main() {}",
    version: 1,
};

let inputs = [
    "{",
    r#"""
    {
        "jsonrpc": "2.0",
        "method": "textDocument/didChange",
        "params": {
            "textDocument": { "uri": "untitled:demo.cv", "version": 2 },
            "contentChanges": [
                { "text": "fn main() { let value: i32 = true; println(value); }" }
            ]
        }
    }
    """#,
];

for text in inputs {
    try {
        let message = Value::parse(text)?;
        apply_notification(&document, message)?;
        println(document.version, document.text);
    } catch {
        JSONError(_) => println("Invalid JSON"),
        ValueError(_) => println("Invalid fields"),
        ProtocolError(_) => println("Invalid edit"),
    }
}
```

在练习目录中，连同协议模块一起运行：

```sh
carven interpret document_edit.cv tools/lsp/protocol.cv
```

标准输出为：

```text
Invalid JSON
2 fn main() { let value: i32 = true; println(value); }
```

第一条无效消息被拒绝，下一条消息仍能更新文档。程序已经准备好一段含有类型错误的源文本，接下来把它送去分析。

`Value::parse` 对无效 JSON 报告 JSONError。字段缺失或值类型不符时，get、at 和 as_i64 报告 ValueError；修改无效时，apply_change 可以报告 ProtocolError。局部 try 处理这些失败后继续下一条消息。借用子值的文本时，先绑定返回的子值，再调用 as_str()。`r#"""` 和 `"""#` 定界符保留多行 JSON 中的引号。

每项修改都应用到上一项修改后的文本。循环全部成功后，`&&text` 才把新文本转移进文档，由结构体持有这个 String。旧版本则在修改状态前直接返回。

亲手检查这一步：把 true 改成 42 后再运行；接着把 version 改成 1，确认原文档仍停留在版本 1；最后把版本号改成 JSON 字符串，确认程序报告 Invalid fields。

应用中，`textDocument/didOpen` 创建保存的文档，`didChange` 完成这项更新。处理器还会校验消息外层结构。有 id 的请求参数无效时返回错误回复；文档修改通知无效时跳过该次更新。把修改后的文本和版本用于下一步分析任务。

## 分析时继续接收消息

语言服务器等待一次分析回复时，还要接收后续编辑。让输入、分派、分析和输出各自作为子操作运行，用有容量上限的通道连接它们。

在应用 `main` 启动分析器并完成握手之后，启动这些子操作：

```carven
let events = ByteChannel::new(16);
let jobs = ByteChannel::new(1);
let output = ByteChannel::new(16);

async let writer = write_output(output);
async let reader = read_input(events);
async let worker = analyze(analyzer, jobs, events);
async let dispatch = session(events, jobs, output);

let (index, _) = await wait_ready(reader, worker, dispatch, writer);

if index == 0 {
    await reader?;
    await dispatch?;
} else if index == 1 {
    await worker?;
    throw ProtocolError::Analyzer;
} else if index == 2 {
    await dispatch?;
    cancel reader;
} else {
    await writer?;
    throw ProtocolError::Analyzer;
}
```

ByteChannel 从 `std::channel` 导入，wait_ready 和 close 从 `std::async` 导入。每个 `async let` 启动子操作，此处不等待它结束。一个子操作等待输入或分析时，其他就绪的子操作可以继续运行。四个子操作分工如下：

| 子操作   | 任务                               | 通道使用                           |
| -------- | ---------------------------------- | ---------------------------------- |
| reader   | 读取编辑器字节，报告输入结束。     | 向 events 发送输入。               |
| dispatch | 应用修改，选择分析任务，组装回复。 | 接收 events，发送 jobs 和 output。 |
| worker   | 等待分析器回复。                   | 接收 jobs，向 events 发送结果。    |
| writer   | 写出完整协议帧。                   | 接收 output。                      |

`wait_ready` 返回 `(usize, bool)`：已进入终态的子操作在实参列表中的从零开始位置，以及它的取消标记。元组绑定保留 index，用 `_` 丢弃取消标记。dispatch 先结束的分支先 await 它，再用 `cancel reader;` 请求取消仍在等待输入的子操作。await 仍会传播子操作声明的失败；worker 或 writer 意外成功返回时，则报告分析器失败。

把可修改的文档状态留在 dispatch 中。通过通道发送管理自己数据的消息，让消费者可以保留自己的数据。通道容量按消息数计算；容量耗尽时，await 的发送会等待空位。分析与输入就可以分别推进，各个任务通过消息协作。

解析 JSON 前，先恢复消息边界。把输入块交给 `protocol.cv` 中的 Decoder，它保留不完整帧，返回完整的 String 正文。Content-Length 按 UTF-8 字节计数；一次读取可能停在字符内部，也可能包含多条消息。输入结束时，`decoder.finish()` 检查是否有截断帧。前面的分帧测试会在每个字节边界切分连续的 Unicode 消息。

## 把修改后的文档送去分析

每接受一次编辑，用 `Value::object()` 和 `set` 组装 update 对象，包含 URI、模块标识、编辑器版本和重建的文本。应用把这个对象排队，分析器空闲时将请求发给 jobs。

用异步接收循环处理这些任务。更新请求调用 request，项目重载调用 workspace。已有的 packet 辅助函数在字节前加一个事件标记；标记 1 表示分析结果，让 dispatch 能与输入事件区分。工作任务如下：

```carven
async fn analyze(
    analyzer: Analyzer,
    jobs: ByteChannel,
    events: ByteChannel
) throw ProcessError + ValueError + JSONError + UTF8Error + ProtocolError {
    while {
        match await jobs.receive() {
            .End => return,
            .Data(bytes) => {
                let message = Value::parse_bytes(bytes)?;
                let method = message.get("method")?;

                let result = if method.as_str()? == "workspace" {
                    await workspace(analyzer, &&message)?
                } else {
                    await request(analyzer, &&message)?
                };

                let body = result.to_json()?;
                if !await events.send(&&packet(1, body.bytes)) { return; }
            },
        }
    }
}
```

worker 处理每个 `.Data(bytes)` 任务，通道关闭后收到 `.End` 时返回。method 字段决定执行文档请求还是重载工作区。

`await request(analyzer, &&message)?` 把请求转移给分析操作，等待完成，再传播声明过的失败。分析器通过 `std::process` 作为子进程运行。工作任务等待回复时，reader 可以接收新的编辑，dispatch 可以继续更新文档集合。

用 `to_json()` 序列化结果，再把保存独立数据的包发送回 events。即使局部 body String 已销毁，数据包仍可使用。`session` 收到结果后交给 `complete`，清除当前任务状态并准备通知。

用 `tools/lsp/tests/protocol.ts` 中受控分析器的场景检查这一步：它暂时保留分析回复，同时继续发送编辑器消息。确认服务器接受了这些消息，并最终发布最新文档版本的诊断。修改调度代码后，在服务器项目根目录运行 `./xmakew test carven-lsp/protocol`。

## 返回当前文本的诊断

把分析结果转换为 `textDocument/publishDiagnostics` 通知。在 `tools/lsp/server.cv` 的 publish 循环中，document 是当前文档，items 包含收集好的诊断项。把这些诊断项放进 JSON 对象：

```carven
var params = Value::object();
params.set("uri", &&Value::string(document.uri.as_str()))?;
if find(self, document.uri.as_str()) != self.documents.length() {
    params.set("version", &&Value::integer(document.version))?;
}
params.set("diagnostics", &&items)?;

var notification = Value::object();
notification.set("jsonrpc", &&Value::string("2.0"))?;
notification.set("method", &&Value::string("textDocument/publishDiagnostics"))?;
notification.set("params", &&params)?;

self.outbox.send(notification)?;
```

`&&items` 把诊断数组转移进 params，`&&params` 再把这个对象转移进通知。Outbox 把完整消息保存为输出帧。

让结果对应到它所分析的文本。编辑器版本标识一个已打开文档的文本；每次接受修改后，服务器还会递增工作区 generation，只有任务的 generation 仍与当前值相同时才发布分析结果。后续编辑也可能影响依赖它的文件的诊断。分析器自己的 revision 则在分析请求之间单独传递。

用对应的分析源文本构造每条诊断的范围。分析器返回 UTF-8 字节偏移，这里的 LSP 位置使用 UTF-16 码元。对于 `中😀x`，x 的字节偏移为 7，UTF-16 位置为 3。`range` 辅助函数转换范围的两端。未打开的项目文件也参与分析，它们的通知省略编辑器版本。

新文本没有诊断时，发送空数组。文档从项目移除时，也清除它之前发布的诊断。编辑器就会移除旧错误标记。

在 `tools/lsp/protocol.cv` 中，用 `Outbox::send` 给输出 JSON 添加帧头：

```carven
fn send(&self, message: Value) throw ValueError {
    let body = message.to_json()?;
    let framed = f"Content-Length: {body.byte_length()}\r\n\r\n{body}";
    self.messages.push(&&Vector<u8>::from_slice(framed.bytes));
}
```

用 `byte_length()` 计算帧头中的内容长度。通过 output 把字节向量转移给唯一的 writer，由它调用 `write_stdout_async`。标准输出用于协议帧，调试信息写到标准错误。

用协议测试中的编辑顺序检查结果：有效文本产生空数组，把 true 赋给 i32 产生类型诊断，改为 42 并提高版本号后清除诊断。同时检查 URI、版本和数组内容。发送旧版本修改时，应保留当前文档。

## 写完回复并关闭任务

把关闭也作为消息流程的一部分处理。LSP shutdown 请求停止新任务并回复 null，随后的 exit 通知结束 dispatch。shutdown 之后遇到输入结束，也可以在 Decoder 确认最后一帧完整后结束会话。

然后沿着数据流关闭子操作：

```carven
await close(reader);

events.close();
jobs.close();
output.close();

await writer?;

// Drain the active analyzer transaction before its shutdown handshake.
await worker?;

await stop_analyzer(analyzer)?;
```

`cancel reader;` 请求取消，`await close(reader)` 则等待这个子操作不再使用保留的数据。关闭通道后，消费者可以读完已接受的消息，再收到 End。等待 writer 写完排队回复，再等待 worker 完成当前分析器通信。

最后，`stop_analyzer` 向分析器发送 shutdown 请求、读取回复、关闭进程输入，再等待退出状态。每个具名子操作都属于声明它的词法作用域；失败退出时，作用域也会先关闭子操作，再释放它们所需的数据。

编辑器的请求取消与结束子操作有各自的用途。对于 `$/cancelRequest`，移除排队查询，或把正在处理的查询标为已取消。已经开始的分析器通信仍会读完回复，再开始下一次通信；丢弃已取消查询的结果。这样后续回复仍与各自请求配对。

在 `tools/lsp/tests/protocol.ts` 中检查关闭流程：客户端发送 shutdown，收到 null 回复，再发送 exit，等待进程成功退出。测试还会检查是否有多余输出。

## 扩展任务

1. 把可运行的文档修改程序改为在一条通知中应用两项修改。让第二项无效，在输入循环之后添加 `println(document.version, document.text);`，验证保存的文本和版本都没有改变。
2. 在表情字符附近加入 UTF-16 范围修改。检查结果文本，再在协议测试中检查诊断报告的范围。
3. 在受控分析器测试保留回复期间再加入一次编辑，确认只发布当前文本的诊断，并且 shutdown 仍能结束。

修改服务器项目时，在该项目根目录用 `./xmakew test -g lsp` 运行全部语言服务器测试组。[tools/lsp 实现](https://github.com/ryblust/carven/tree/main/tools/lsp)涉及 `server.cv`、`protocol.cv` 和 `main.cv` 中的异步循环。具体契约见 [JSON 值](/zh/reference/json/)、[异步操作](/zh/reference/async/)和[输入与输出](/zh/reference/io/)。
