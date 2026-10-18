---
title: "TCP 网络"
description: "宿主连接上的冷读写操作、部分进度、取消与原生实现的生命周期。"
section: reference
lesson: 31
source: docs/language/net.md
---

`std::net` 用于读写由 C++ 宿主提供的 TCP 连接。宿主先创建已连接的套接字，Carven 通过 `ConnectionView` 引用它；复制视图不会复制或取得套接字的所有权。该 API 不负责建连、监听、域名解析或 TLS。

## ConnectionView 与 NetError

按需从 `std::net` 导入 `ConnectionView`、`NetError`、`borrow`、`read`、`write`、`write_all`，这些名字都不是默认绑定。`Read<T>` 声明在 `std::io`，显式命名时需要单独导入。

`ConnectionView` 是源码结构体，公开字段为 `native: ::carven::standard::net::View`。原生 `View` 在 C++ 中保存 `connection: const Connection*`。该视图借用宿主连接，构造与复制都不会延长连接的生命周期。

`borrow(native: ::carven::standard::net::View) -> ConnectionView` 是无失败的同步 `export(cpp)` 源码函数；宿主通过下文的生成 C++ 入口调用它，源码也可用普通导入选择它。

`NetError` 是含 `System(i32)`、`Closed`、`Conflict`、`NoProgress` 的载荷枚举。`System` 携带平台错误码；`Closed` 表示连接不存在或已关闭。同方向操作冲突及写入无进展的规则见下文。

## 连接读写

`std::net` 提供 `ConnectionView`、`NetError`，以及操作原生宿主连接的冷操作。

| 函数                                                               | 契约                                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `read(view: ConnectionView, max_bytes: usize) -> Read<Vector<u8>>` | 限制必须为正；返回至少一字节的 `Read<Vector<u8>>::Data`，正常接收 EOF 为 `End` |
| `write(view: ConnectionView, &&bytes: Vector<u8>) -> usize`        | 消耗缓冲区，返回实际写入的字节数，可能少于缓冲区长度；空输入成功返回零         |
| `write_all(view: ConnectionView, &&bytes: Vector<u8>) -> void`     | 消耗并保留缓冲区，处理短写，全部发送后才完成                                   |

三个函数均为声明 `throw NetError` 的 `async fn`，表中类型表示成功完成的结果；调用先创建冷操作。

写缓冲区的所有权转入冷操作，持续到完成或取消清理。读返回字节块，记录分帧和编码校验由调用者选择，可组合[字节分帧](/zh/reference/io/#字节分帧)。

取消遵循[异步完成规则](/zh/reference/async/)。一个原生连接可以同时有一个读和一个写；同方向第二个操作以 `Conflict` 失败。非空 `write_all` 在一次写入返回零字节时以 `NoProgress` 失败。空写不调用原生操作。

`write_all` 在整个缓冲区发送期间持续占用发送方向，包括短写和等待就绪的阶段。请求取消后，仍须先让操作完成或等待其关闭，再关闭或复用连接。

## 原生宿主契约

包含 `<carven/std/net/native.hpp>`。创建 `carven::standard::net::Network`，将已连接的 TCP 套接字交给内存地址保持不变的 `carven::standard::net::Connection` 对象。接管将 I/O 设为非阻塞；检查 network 和 connection 的 `startup_error()`。

连接拥有套接字，不可复制或移动，并且恰好关闭一次。无挂起操作时 `close()` 幂等；有读写挂起时报告 `Conflict`。先完成所有写操作，再调用 `shutdown_send()` 关闭发送方向。有写操作挂起时，它报告 `Conflict`；套接字已经关闭时报告 `Closed`。析构要求没有挂起操作。

使用生成头 `<carven/api/crafts/carven/std/net.hpp>` 及 `carven::api::crafts::carven::std::net::borrow({&connection})` 构造源码 `ConnectionView`，将其绑定为具名变量。空原生视图在 I/O 时报告 `Closed`。

编译器检查用于创建冷操作的具名连接视图是否保持存活，直到操作结束或关闭。宿主还必须保留它指向的 Connection、Network 和隐藏的原生状态，直到所有原生操作结束，包括取消和关闭。复制 view 不会复制或拥有 socket。

将 Network 作为显式 EventSource 传给同线程 `drive_root`。它与运行时计时器和输入事件协作。销毁 view、连接或 network 前先结束所有子任务；取消请求本身不证明原生实现已停止访问。

## 平台与能力边界

POSIX 用 poll，发送时通过 `MSG_NOSIGNAL` 或 socket 的 `SO_NOSIGPIPE` 抑制 SIGPIPE，不修改进程信号处理器。Windows 用 WSAPoll，Network 管理 WSAStartup/WSACleanup；原生提供者和最终使用者链接 `ws2_32`。

这些原生调用需要原生执行，不能在浏览器 Playground Run 或语义解释器中执行。宿主管理网络初始化、资源所有权与清理。

完整宿主与源码组合可参考主仓库的[流式采集器](https://github.com/ryblust/carven/tree/main/examples/stream_collector)；异步原生实现和关闭规则见[异步参考](/zh/reference/async/)。
