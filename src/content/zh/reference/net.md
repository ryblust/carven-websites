---
title: "TCP 网络与原生宿主"
description: "宿主连接上的冷读写操作、部分进度、取消与 provider 生命周期。"
section: reference
lesson: 32
source: docs/language/net.md
---

std::net 用于读写由 C++ 宿主提供的 TCP 连接。宿主先创建已连接的 socket，Carven 通过 ConnectionView 引用它；复制视图不会复制或取得 socket 的所有权。该 API 不负责建连、域名解析或 TLS。

## 源码操作

`std::net` 提供 `ConnectionView`、`NetError`，以及操作原生宿主连接的冷操作。

| 函数                       | 契约                                                                           |
| -------------------------- | ------------------------------------------------------------------------------ |
| `read(view, max_bytes)`    | 限制必须为正；返回至少一字节的 `Read<Vector<u8>>::Data`，正常接收 EOF 为 `End` |
| `write(view, &&bytes)`     | 消耗缓冲区，返回可能短写的字节数；空输入成功返回零                             |
| `write_all(view, &&bytes)` | 消耗并保留缓冲区，处理短写，全部发送后才完成                                   |

写缓冲区的所有权转入冷操作，持续到完成或取消清理。读返回字节块，记录分帧和编码校验由调用者选择，可组合[字节分帧](/zh/reference/io/#字节分帧)。

`NetError` 为 `System(i32)`、`Closed`、`Conflict`、`NoProgress`。取消是运行时独立的完成状态。一个原生连接可以同时有一个读和一个写；同方向第二个操作以 `Conflict` 失败。非空 `write_all` 零进度时以 `NoProgress` 失败。空写不调用原生操作。

## 原生宿主契约

包含 `<carven/std/net/native.hpp>`。创建 `carven::standard::net::Network`，将已连接 TCP socket 交给地址稳定的 `carven::standard::net::Connection` 对象。接管将 I/O 设为非阻塞；检查 network 和 connection 的 `startup_error()`。

连接拥有 socket，不可复制或移动，并且恰好关闭一次。无挂起操作时 `close()` 幂等；有读写挂起时报告 `Conflict`。`shutdown_send()` 在挂起写完成后发送 EOF。析构要求没有挂起操作。

使用生成头 `<carven/api/crafts/carven/std/net.hpp>` 及 `carven::api::crafts::carven::std::net::borrow({&connection})` 构造源码 `ConnectionView`，将其绑定为具名变量。空原生视图在 I/O 时报告 `Closed`。

编译器检查用于创建冷操作的具名连接视图是否保持存活，直到操作结束或关闭。宿主还必须保证它指向的 connection、network 与隐藏原生状态活到所有原生实现完成，包括取消和关闭。复制 view 不会复制或拥有 socket。

将 Network 作为显式 EventSource 传给同线程 `drive_root`。它与运行时计时器和输入事件协作。销毁 view、连接或 network 前先结束所有子任务；取消请求本身不证明原生实现已停止访问。

## 平台与能力边界

POSIX 用 poll，发送时通过 `MSG_NOSIGNAL` 或 socket 的 `SO_NOSIGPIPE` 抑制 SIGPIPE，不修改进程信号处理器。Windows 用 WSAPoll，Network 管理 WSAStartup/WSACleanup；原生 产生操作的函数 与最终 consumer 链接 `ws2_32`。

源码 API 借用宿主已有连接，不创建连接或监听器，不解析域名，也不提供 TLS。原生调用需要原生执行，不能在浏览器 Playground Run 或语义解释器中执行。宿主管理网络初始化、资源所有权与清理。

完整宿主与源码组合可参考主仓库的[流式采集器](https://github.com/ryblust/carven/tree/main/examples/stream_collector)；异步原生实现和关闭规则见[异步参考](/zh/reference/async/)。
