---
title: "异步字节通道"
description: "在同一异步驱动器上，通过有界通道交换拥有型字节消息。"
section: reference
lesson: 33
source: docs/language/channel.md
---

`std::channel::ByteChannel` 在同一异步驱动器的任务间交换拥有型字节消息。复制句柄共享通道状态，待完成的操作也保持状态存活。通道支持显式静态执行，但句柄只能留在本次执行内，不能保留为模块常量。

```carven
import std::channel using ByteChannel;

async fn main() {
    let channel = ByteChannel::new(2);
    assert(await channel.send(&&[1u8, 2u8]));
    match await channel.receive() {
        .Data(bytes) => assert(bytes.length() == 2),
        .End => assert(false),
    }
    channel.close();
}
```

`new(capacity)` 要求消息容量为正。`send(&&bytes)` 返回冷 `Operation<bool>`，满队列时等待，通道已关闭时返回 `false`。`receive()` 返回冷 `Operation<ReadResult<Vector<u8>>>`，空队列时等待。消息按入队顺序交付，空消息保留为 `Data([])`。容量以消息条数计，应用须另行限制每条消息的字节数。

`close()` 封闭通道并唤醒等待操作。接收方先排空已接收消息，再得到 `End`；可以重复关闭。取消尚未提交的发送或接收只移除该操作，其他等待者和已排队消息保持可用。已提交完成的操作可能优先于同时到来的取消请求。

`try_send(&&bytes)` 不等待，队列已满或关闭时返回 `false`；无论结果如何都消耗传入的字节。`try_receive()` 返回 `ChannelReadResult`：`Data(bytes)` 携带消息，`Pending` 表示通道开放但队列为空，`End` 表示关闭且已排空。空消息仍为 `Data([])`。

这些是宿主操作。包括原生消费者在内，所有句柄都必须留在同一驱动器线程。
