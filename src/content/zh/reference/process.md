---
title: "进程与宿主查询"
description: "启动进程、交换字节、观察退出状态并查询宿主。"
section: reference
lesson: 35
source: docs/language/process.md
---

`std::process` 提供宿主进程查询和子进程执行。生成程序与语义执行使用同一提供者，管道和继承标准流的进程支持 Windows、macOS、Linux。

## 宿主进程

`arguments() -> Vector<String> throw ProcessError` 返回当前宿主的实参，不含可执行文件名，保留空实参。`executable() -> String throw ProcessError` 返回绝对可执行路径。静态和解释执行查询的是编译器进程，不替换为被解释入口的实参。

`find_executable(name: str) -> String throw ProcessError` 解析显式路径，或在 `PATH` 搜索裸名字。绝对结果保留选中的符号链接名，使 `clang++` 等驱动器保留其行为。缺失可执行文件或无效宿主文本产生系统错误。

`operating_system() -> OperatingSystem` 返回提供者所在系统：`Windows`、`MacOS`、`Linux` 或 `Other`。实参与可执行路径查询在其他平台报告 `ENOTSUP`。

## 同步命令

`environment(name: str) -> String throw ProcessError` 读取 UTF-8 环境值，缺失和空值均返回空字符串。

`run(program: str, arguments: [String]) -> i32 throw ProcessError` 启动子进程，继承 `stdin`、`stdout`、`stderr`，等待退出码。`run_to(program, arguments, output: str)` 将 `stdout` 重定向到替换写入的文件，空路径表示继承。实参独立传递，不经过 shell；启动或等待错误抛 `ProcessError::System(code)`，非零退出码仍为普通结果。

`run_with(program, arguments, options: RunOptions)` 还选择子进程工作目录。`RunOptions` 含 `directory: str` 与 `output: str`；空值继承当前目录和 `stdout`，输出文件相对于调用者目录。调用进程的目录不变。三种调用均支持静态和解释执行。

```carven
import std::process using run_with;

let status = run_with("git", ["status", "--short"], {
    directory: "checkout",
    output: "status.txt"
})?;
```

## 管道进程

从 `std::process` 导入 `Process` 和 `ProcessError`。`Process::spawn(program, arguments)` 使用独立实参创建子进程，为裸程序名搜索 `PATH`，继承工作目录、环境和 `stderr`，拒绝嵌入 NUL。句柄拥有子进程及其 `stdin`、`stdout` 通信端点，副本共享同一个子进程。

`spawn_in(program, arguments, directory)` 在创建时选择子进程目录，不改变调用者目录；空目录表示继承。

| 操作                                               | 完成结果                                                                |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| `Process::spawn(program, arguments)`               | 进程句柄，或 `ProcessError::System(code)`                               |
| `Process::spawn_in(program, arguments, directory)` | 在指定目录启动的子进程                                                  |
| `Process::spawn_inherited(program, arguments)`     | 继承三个标准流的子进程                                                  |
| `child.read(limit)`                                | 冷操作，返回 `ReadResult<Vector<u8>>::Data(bytes)` 或 `End`，上限须为正 |
| `child.write_all(&&bytes)`                         | 冷操作，保留字节直到全部写完                                            |
| `child.close_input()`                              | 写入完成后发送 EOF                                                      |
| `child.wait()`                                     | 冷操作，返回退出码；信号终止为 `128 + signal`                           |
| `child.terminate()`                                | 请求立即终止子进程                                                      |

读、写、等待使用 `ProcessError::System` 报告系统错误。一个读取、一个写入和一个等待可同时进行，同方向重叠报告 `EBUSY`。读取最多返回 64 KiB，即使请求更大；字节块不做文本解码或分帧。`stderr` 独立于协议流。

操作使用同线程驱动器、计时器、取消和词法子任务关闭。Windows 使用字节管道及可取消的原生写入，待完成的写入不阻塞驱动器。取消读取不消耗待处理输入；取消写入不能撤回已发送字节；取消等待不终止子进程。退出等待以有界间隔轮询，已观察状态可供之后重复等待。

让读取至 EOF 的子进程退出时，先关闭输入。重复关闭成功，已断开的对端也满足关闭；其他系统错误和仍活动的写入会失败。协议关闭后 await `wait()`，观察并回收进程。最后一个原生句柄销毁时终止并回收尚未回收的子进程；冷和活动操作保持源持有者及原生状态存活，不管理后代进程。

标为 `const fn` 的操作支持显式静态执行，使用编译器的环境并要求宿主允许效果。原生句柄不能冻结为常量。语义执行在本线程推进同一提供者的异步操作。

## 进程组

`ProcessGroup::new()` 创建共享组。`group.spawn_inherited(program, arguments)` 启动子进程并加入组。`group.wait()` 同步等待任一子进程退出，移除它，返回 `ProcessExit { index: usize, status: i32 }`。索引是移除前的当前插入顺序，空组等待报告系统错误。实参不经过 shell。

组拥有子进程，副本共享组。调用者可按相同顺序保存任务信息；最后一个组所有者销毁时释放剩余句柄。`available_parallelism()` 返回正数并发提示，由调用者选择上限。组提供生命周期操作，不替调用者决定调度策略。
