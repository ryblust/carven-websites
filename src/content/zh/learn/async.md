---
title: "启动异步工作并组合结果"
description: "决定何时启动工作，组合结果，设置截止时间，并在离开作用域前结束子任务。"
section: learn
lesson: 14
source: docs/language/async.md
---

## 构造工作，再执行它

等待输入或时间的工作，可以写成异步函数，让其他已安排的工作有机会继续。先分清“描述要做什么”和“真正开始做”。保存为 async_work.cv：

```carven
import std::async using yield_once;

async fn load_count(value: i32) -> i32 {
    println("start", value);
    await yield_once();
    return value;
}

async fn main() {
    let pending = load_count(21);
    println("constructed");
    println(await pending);
}
```

输出：

```text
constructed
start 21
21
```

调用 `async fn` 产生**冷操作**，直到 await 或作为子任务启动才执行函数体。`-> i32` 描述完成值，而不是操作本身。前缀 await 只消费一次命名操作，不额外写 `&&`。未启动的操作离开作用域时，不会执行函数体。裸写 `load_count(21);` 会被拒绝，因为既没有命名也没有执行这个操作。

输出中 constructed 最先出现，因为创建 pending 尚未运行 load_count。await 随后启动它。yield_once 让其他就绪工作先执行一轮，再继续当前函数。若等待的函数可以立即完成，单是 await 不会强制让出执行。这是同一线程上的协作式调度，耗时的同步计算仍会阻塞其他工作。

## 组合相互独立的结果

用这个完整批处理程序替换上一个文件：

```carven
import std::async using { when_all as join, yield_once };

async fn subtotal(price: i32, quantity: i32) -> i32 {
    await yield_once();
    return price * quantity;
}

async fn record_audit() {
    await yield_once();
}

async fn main() {
    let (amount, _, (second, third)) = await join(
        subtotal(1200, 2),
        record_audit(),
        join(subtotal(300, 3), subtotal(500, 1))
    );
    println(amount, second + third);
}
```

输出 `2400 1400`。when_all 启动所有输入，并按输入顺序返回结果。嵌套 join 保留嵌套。record_audit 贡献 `()`，所以目标在该位置使用 `_`。别名 join 选择与 when_all 相同的内建操作和完成规则。

把存储的操作传给组合时使用 Take，例如 `join(&&pending, other())`。冷操作只能运行一次，因此不能复制，也不能由闭包捕获。需要显式拼写 `Operation<i32>` 或 `Operation<i32, throw LoadError>` 时，从 `std::async` 导入 Operation。构造组合本身仍不会启动输入。

when_any 接受第一个完成结果，无论成功或失败；first_successful 则在候选失败后继续寻找成功。两者都返回 `(usize, T)`，包含输入位置与共同成功类型，并在返回前关闭全部输入。类型化失败集合取并集，取消仍是独立完成状态。

## 为请求设置截止时间

把这个独立程序保存为 deadline.cv：

```carven
import std::time using { sleep, timeout, RangeError, Timeout };

async fn load() -> i32 throw RangeError {
    await sleep(50ms)?;
    return 42;
}

async fn main() throw RangeError {
    let result = try {
        await timeout(load(), 0ms)?
    } catch {
        Timeout(_) => -1,
    };
    println(result);
}
```

它确定地输出 `-1`：非正超时直接选择 Timeout，不启动 load。改成 `100ms` 可以让它尝试完成，但调度与宿主负载仍可能影响哪个完成先胜出。时间字面量（`ns`、`us`、`ms`、`s`）构造经过范围检查的 Duration 值。使用字面量不需要导入类型，显式命名类型才需要。

sleep 与 timeout 的截止时间运算不可表示时可能产生 RangeError。try 处理 Timeout，main 的显式契约保留 RangeError。`await operation()?` 先等待完成，再传播类型化失败。取消是独立完成状态，不通过命名失败载荷来捕获。

timeout 在交付结果前关闭受保护工作。工作不配合取消时，关闭过程可能超过间隔。它提供带结构化清理的完成期限，不会强行终止代码。

## 启动由当前作用域负责的子任务

```carven
import std::async using { close, yield_once };

async fn update(&count: i32) {
    await yield_once();
    count += 1;
}

async fn main() {
    var count = 0;
    async let child = update(&count);
    await child;
    println(count);

    async let unused = update(&count);
    await close(unused);
    println("closed");
}
```

先输出 `1`，再输出 `closed`。程序不依赖 unused 是否在关闭前执行更新：close 丢弃该结果。async let 调度工作，并由词法作用域负责子任务。正常离开之前，要 await 子任务、close 它，或请求 `cancel child;`。子任务不能复制、转移或传入冷组合。

`cancel child;` 请求取消后立即返回，不表示清理完成，也不释放保留的存储。`await close(child)` 请求取消，并等到子任务及其底层操作都不再使用保留的数据。它丢弃结果；返回后，数据便不再受该子任务占用。返回或失败离开作用域时，也会在销毁存储前关闭子任务。

子任务通过 Write 访问变量时，应把变量保留在原处，直到 await 或 close 完成。提前取走它或重建它的存储，会使子任务继续访问失效数据，编译器会拒绝这些操作。纯 Read 值是快照；借用的 str、切片、指针和可调用视图不作为异步输入。工作需要保留文本时，用 Take 传入拥有内容的 String。

## 在编译期检查异步算法

```carven
import std::async using { when_all, yield_once };

const async fn next(value: i32) -> i32 {
    await yield_once();
    return value + 1;
}

const test "joined results" {
    let (first, second) = await when_all(next(20), next(21));
    check(first == 21);
    check(second == 22);
}
```

`carven check async_tests.cv` 执行这个静态测试。普通运行时测试可使用同步 helper，没有 `async test` 语法。支持的静态和解释执行异步操作遵循同样的冷操作、调度、所有权与关闭规则。原生 C++ provider 函数体仍要求原生执行。

完成库存项目后，继续[JSON 输入项目](/zh/learn/data-pipeline/)，把这些操作与真实输入结合。`std::net` 网络操作使用宿主提供的 TCP 连接：原生宿主负责创建、保留 socket 并驱动事件源。源码 API 不创建监听器、不解析域名，也不提供 TLS；详见[标准库参考](/zh/reference/library/)。

## 练习

给组合程序加入第四笔小计，并更新递归目标。把 `await child` 换成 `cancel child;`，解释为什么不能再依赖更新后的计数。加入静态测试，分别验证 `when_all()` 返回 `()`、单个输入返回单元素元组。
