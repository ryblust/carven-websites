---
title: "文件与路径"
description: "通过执行宿主读写文件、扫描目录并解析路径。"
section: reference
lesson: 34
source: docs/language/fs.md
---

`std::fs` 提供分块或完整文件读取、写入、路径查询、文件列表和目录创建。操作同步执行。路径为 UTF-8，相对路径以进程工作目录为基准；访问文件系统的操作遇到包含 NUL 的路径时产生 `FileError::System`。函数均为 `const fn`，静态文件访问要求分析宿主允许效果。`parent` 和 `join` 只做词法路径操作，不访问文件系统。

```carven
import std::fs using { create_directories, read_text, write_text }

create_directories("build/generated")?;
write_text("build/generated/message.txt", "hello\n")?;
let message = read_text("build/generated/message.txt")?;
```

| 函数                                  | 结果                                                  |
| ------------------------------------- | ----------------------------------------------------- |
| `read_bytes(path: str)`               | 完整文件的 `Vector<u8>`                               |
| `write_bytes(path: str, bytes: [u8])` | 用借用字节创建或替换文件                              |
| `read_text(path: str)`                | UTF-8 校验后的 `String`                               |
| `write_text(path: str, text: str)`    | 写出 UTF-8，不转换换行                                |
| `canonical(path: str)`                | 解析符号链接、`.`、`..` 后的绝对路径                  |
| `resolve(path: str)`                  | 解析现存前缀并规范化允许不存在的后缀                  |
| `parent(path: str)`                   | 使用宿主路径语法、以 `/` 分隔的词法父路径；没有则为空 |
| `join(base: str, path: str)`          | 词法拼接；绝对 `path` 替换 `base`                     |
| `remove(path: str)`                   | 移除文件、符号链接或空目录，返回是否移除了条目        |
| `status(path: str)`                   | `PathKind::Missing`、`File`、`Directory` 或 `Other`   |
| `create_directories(path: str)`       | 创建缺失父目录，已有目录也成功                        |
| `files(scan: DirectoryScan)`          | 扫描选中的普通文件路径，结果已排序                    |

除不抛失败的 `parent`、`join` 外，文件操作可抛 `FileError`。`System(i32)` 携带平台错误码；`InvalidUTF8(UTF8Error)` 表示 `read_text` 的编码失败。字节读取允许任意内容。成功写入在返回前完成文件关闭。

## 流式读取

`FileReader::open(path: str)` 打开二进制流。`read(limit: usize)` 要求正数上限，返回 `std::io::ReadResult<Vector<u8>>`：非空 `Data(bytes)` 不超过上限，或用 `End` 表示结束。每次读取推进游标，结束后重复读取仍返回 `End`。单次存储量不依赖文件总大小。

```carven
import std::fs using FileReader;

let reader = FileReader::open("input.bin")?;
var size = 0usize;
while {
    match reader.read(16384)? {
        .Data(bytes) => { size += bytes.length(); },
        .End => break,
    }
}
reader.close()?;
println(size);
```

句柄副本共享游标和打开状态。`close()` 为全部副本释放文件，重复关闭成功；关闭后读取抛 `FileError::System`。最后一个副本离开作用域时自动释放文件，包括错误退出。打开、读取和显式关闭错误均用 `FileError::System`。方法可在允许宿主效果时静态执行，但句柄不能冻结为常量；分块读取仍受字节和工作预算限制。

## 路径与目录

`status` 跟随符号链接，路径缺失或链接悬空时返回 `Missing`，查找错误则抛失败。写文件不自动创建父目录。`canonical` 要求路径存在，返回有效 UTF-8，分隔符为 `/`。`resolve` 允许最后部分不存在，但不创建路径；两者均通过文件系统解析符号链接。

`DirectoryScan` 使用具名字段指定根目录、递归和排除子树：

```carven
import std::fs using files;

let sources = files({ root: "src", recursive: true, ... })?;
let local = files({ root: ".", ... })?;
```

根不存在时返回空向量，不跟随目录符号链接。非空 `excluded_root` 指定排除子树，该子树可以尚不存在；解析到该子树的路径也被排除。返回路径保持根的相对或绝对形式，使用 `/`，文件名必须为有效 UTF-8。
