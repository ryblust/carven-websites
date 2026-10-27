---
title: "TCP networking"
description: "Cold reads and writes over host-owned connections, partial progress, and provider lifetimes."
section: reference
lesson: 31
source: docs/language/net.md
---

Use `std::net` to read and write a TCP connection supplied by a C++ host. The host creates the connected socket; Carven receives a `NetConnectionView` that refers to it. The view does not own or duplicate the socket. Connection creation, listening, name lookup, and TLS are outside this API.

<span id="connectionview-and-neterror"></span>

## NetConnectionView and NetError

Import `NetConnectionView`, `NetError`, `read`, `write`, or `write_all` from `std::net` as needed. None is a default binding. `ReadResult<T>` is declared in `std::io` and requires its own import when named.

`NetConnectionView` is a source struct with one public field, `native: ::carven::standard::net::View`. The native `View` holds `connection: const Connection*` in C++. The view borrows the host connection; neither construction nor copying acquires its lifetime.

`borrow(native: ::carven::standard::net::View) -> NetConnectionView` is an infallible synchronous `export(cpp)` source function. Its generated C++ entry is used by hosts below. It has no ordinary cross-Craft `export`, so application source cannot import it from `std::net`.

`NetError` is a payload enum with `System(i32)`, `Closed`, `Conflict`, and `NoProgress`. `System` carries the platform error code; `Closed` reports an absent or closed connection. Direction conflicts and stalled writes are described below.

## Connection reads and writes

`std::net` provides `NetConnectionView`, `NetError`, and cold operations
over connections supplied by a native host:

| Function                                                                    | Contract                                                                                                                |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `read(view: NetConnectionView, max_bytes: usize) -> ReadResult<Vector<u8>>` | Require a positive limit; return `ReadResult<Vector<u8>>::Data` with at least one byte, or `End` for normal receive EOF |
| `write(view: NetConnectionView, &&bytes: Vector<u8>) -> usize`              | Consume the buffer and return a possibly short byte count; empty input succeeds with zero                               |
| `write_all(view: NetConnectionView, &&bytes: Vector<u8>) -> void`           | Consume the buffer, retain it through short writes, and complete only after all bytes have been sent                    |

All three functions are `const async fn` with the declared failure `NetError`; the result types in the table describe successful completion. Calls construct cold operations.

Write buffers transfer ownership into the cold operation and remain alive through
completion or cancellation. Reads deliver byte chunks; callers frame records and
validate their encoding as needed.

Cancellation follows the [async completion contract](/reference/async/). One read and one write
may be active simultaneously on each native connection. A second operation in
the same direction fails with `Conflict`. A nonempty write_all with zero progress
fails with `NoProgress`. Empty writes perform no native operation.

`write_all` holds the sending direction for the whole buffer, including short
writes and readiness waits. After requesting cancellation, let the operation finish
or await its closure before closing or reusing the connection.

## Native host contract

Include `<carven/std/net/native.hpp>`. Create a `carven::standard::net::Network`, then adopt
connected TCP sockets into address-stable `carven::standard::net::Connection` objects.
Adoption configures nonblocking I/O; inspect `startup_error()` on the network and
each connection. A connection owns its socket, is noncopyable and immovable, and
closes exactly once. `close()` is idempotent after operations finish and reports
`Conflict` while a read or write is pending. After all writes finish, call
`shutdown_send()` to close the sending side. It reports `Conflict` if a write is
pending and `Closed` if the socket is already closed. Destruction requires no
pending operations.

Use the generated `<carven/api/crafts/carven/std/net.hpp>` and
`carven::api::crafts::carven::std::net::borrow({&connection})` to construct
a Carven `NetConnectionView`. Bind the view to a named variable. A null native view
reports `Closed` when used for I/O. The source holder is checked across cold and
active operations; the host must additionally retain its pointed-to connection,
network, and hidden native state until every provider has finished, including
cancellation and close. Copying a view does not copy or own a socket.

Pass the Network as the explicit EventSource to the same-thread `drive_root`.
It composes with runtime timers and input events. Finish children before destroying
views, connections, or the network.

POSIX uses poll and suppresses SIGPIPE per send (`MSG_NOSIGNAL`) or per socket
(`SO_NOSIGPIPE`); it does not change process signal handlers. Windows uses WSAPoll;
Network owns WSAStartup/WSACleanup. Windows native producers and final consumers
link `ws2_32`.

The default CLI and browser Playground do not provide network bindings. Native execution or an explicitly configured semantic host supplies them. Interpreted hosts register the required operations, result accessors, and conversions; static roots additionally require explicit static capability and permission for effects. Bind the host Network as the native event source and keep resources alive through cancellation and child closure. The compiler does not own a Network or link its socket implementation.

See the complete native host and source workflow in the [stream collector example](https://github.com/ryblust/carven/tree/5b10565902fa0a8b614e0c0238311cbf044d8da6/examples/stream_collector), and the [async provider contract](/reference/async/).
