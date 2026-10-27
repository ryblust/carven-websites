---
title: "异步工作流"
description: "决定何时启动工作，组合结果，设置截止时间，发出取消请求，并在离开作用域前结束子任务。"
section: learn
lesson: 14
source: docs/language/async.md
---

## 构造工作，再执行它

等待输入或时间的工作，可以写成异步函数，让其他已安排的工作有机会继续。先分清“描述要做什么”和“真正开始做”。入口需要 `await` 操作时，写成 `async fn main`。保存为 async_work.cv：

```carven run
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

调用 `async fn` 产生**冷操作**，直到 `await` 或作为子任务启动才执行函数体。`-> i32` 描述完成值，而不是操作本身。对命名操作使用 `await` 后，该操作不能再次使用，也不必额外写 `&&`。未启动的操作离开作用域时，不会执行函数体。裸写 `load_count(21);` 会被拒绝，因为既没有命名也没有执行这个操作。

输出中 constructed 最先出现，因为创建 pending 尚未运行 `load_count`。`await` 随后启动它。`yield_once` 让其他就绪工作先执行一轮，再继续当前函数。若等待的函数可以立即完成，单是 `await` 不会强制让出执行。这是同一线程上的协作式调度，耗时的同步计算仍会阻塞其他工作。

`async` 和 `await` 是语言关键字，无需导入。按上例从 `std::async` 导入 `yield_once`；它是内建操作，名字并非默认可用。

## 组合相互独立的结果

用这个完整批处理程序替换上一个文件：

```carven run
import std::async using { when_all as join, yield_once }

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

输出 `2400 1400`。`await` `when_all` 时启动所有输入，并按输入顺序返回结果。嵌套 join 保留嵌套。`record_audit` 返回 `()`，所以元组绑定在该位置使用 `_`。别名 join 选择与 `when_all` 相同的内建操作和完成规则。

把存储的操作传给组合时使用 Take，例如 `join(&&pending, other())`。冷操作只能运行一次。需要写出操作类型或保存操作时，查阅[操作参考](/zh/reference/async/)。

## 从多个来源选择结果

两个候选都可能提供结果时，可以选择不同的等待策略。`when_any` 接受第一个完成，包括失败；`first_successful` 在候选失败后继续等待成功。把这个完整程序保存为 select_result.cv：

```carven run
import std::async using { when_any, first_successful, yield_once }

struct Unavailable {
    value: i32,
}

async fn candidate(value: i32, available: bool) -> i32 throw Unavailable {
    await yield_once();
    if !available { throw Unavailable { value }; }
    return value;
}

async fn main() throw Unavailable {
    try {
        let (index, value) = await when_any(candidate(12, false), candidate(42, true))?;
        println("first completion:", index, value);
    } catch {
        Unavailable(error) => println("first result unavailable:", error.value),
    }

    let (index, value) = await first_successful(candidate(12, false), candidate(42, true))?;
    println("first success:", index, value);
}
```

运行 `carven run select_result.cv`，输出：

```text
first result unavailable: 12
first success: 1 42
```

两个候选都让出一次执行。FIFO 调度让第一个候选先报告 Unavailable。`when_any` 把这次失败交给局部 catch；`first_successful` 则继续等待第二个候选，返回它的输入索引和值。索引从零开始，所以 `1 42` 表示结果来自第二个候选。

两个操作都在交付结果前关闭子任务。失败契约包含各候选声明的失败，因此 `main` 仍须声明第二次调用可能传播的 Unavailable。全部候选都失败时，`first_successful` 报告第一个选定的类型化失败。取消仍是独立完成状态。

## 为请求设置截止时间

在时间限制内等待 `load`，超时产生 `Timeout` 时改用 -1。把这个独立程序保存为 deadline.cv：

```carven run
import std::time using { sleep, timeout, TimeRangeError, Timeout }

async fn load() -> i32 throw TimeRangeError {
    await sleep(50ms)?;
    return 42;
}

async fn main() throw TimeRangeError {
    let result = try {
        await timeout(load(), 0ms)?
    } catch {
        Timeout(_) => -1,
    };
    println(result);
}
```

它确定地输出 `-1`：非正超时直接选择 `Timeout`，不启动 `load`。改成 `100ms` 可以让它尝试完成，但调度顺序和运行环境的负载仍可能影响哪个操作先完成。`100ms` 是 `Duration` 字面量；其他单位与范围检查见[时间参考](/zh/reference/time/)。

`sleep` 与 `timeout` 的截止时间运算不可表示时可能产生 `TimeRangeError`。try 处理 `Timeout`，`main` 的显式契约允许 `TimeRangeError` 继续传播。`await operation()?` 先等待完成，再传播类型化失败。取消是独立完成状态，不通过命名失败载荷来捕获。

`timeout` 在返回结果前结束它所管理的工作。工作不配合取消时，关闭过程可能超过间隔。

## 启动作用域内的子任务

启动一次更新，等待它完成，再读取修改后的计数。把这个独立程序保存为 child_work.cv：

```carven run
import std::async using yield_once;

async fn update(&count: i32) {
    await yield_once();
    count += 1;
}

async fn main() {
    var count = 0;
    async let child = update(&count);
    await child;
    println(count);
}
```

运行 `carven run child_work.cv`，输出 `1`。`async let` 安排更新，由当前作用域负责它的生命周期。`await` child 取得结果，并结束它对 `count` 的访问。子任务不能复制、转移或传入冷组合。

## 请求取消，再等待关闭

让后台计数器执行一轮后停止。由子任务观察停止请求，再检查它的终态，关闭后取走它使用的值。把这个完整程序保存为 cancel_work.cv：

```carven run
import std::async using { cancel_requested, cancel_point, yield_once, wait_ready, close }

async fn count(&completed: i32) {
    while !cancel_requested() {
        completed += 1;
        await yield_once();
    }

    println("cancellation observed");
    await cancel_point();
}

async fn main() {
    var completed = 0;
    async let worker = count(&completed);
    await yield_once();

    cancel worker;
    println("stop requested");

    let (_, cancelled) = await wait_ready(worker);
    println("cancelled", cancelled);
    await close(worker);

    let finished = &&completed;
    println("completed", finished);
}
```

运行 `carven run cancel_work.cv`，输出：

```text
stop requested
cancellation observed
cancelled true
completed 1
```

父任务的 `await yield_once()` 让排队的 worker 增加一次计数，再让出执行机会，回到父任务。`cancel worker;` 请求停止后立即返回，因此先打印 stop requested，worker 随后才观察到请求。子任务中的 `cancel_requested()` 读取该请求，`await cancel_point()` 响应这个请求，以取消状态结束子任务。

`wait_ready(worker)` 等待子任务进入终态，返回索引和取消标记。元组绑定丢弃索引，保留 cancelled。它只查看子任务的状态，不取走结果，也不释放子任务使用的存储。随后 `await close(worker)` 丢弃结果，等到子任务及其底层操作都不再使用这份存储。关闭后才可以 Take completed。

也可以直接调用 `await close(child)`，一次完成请求取消和等待。返回或失败离开作用域时，也会先关闭子任务，再销毁它们使用的存储。取消和类型化失败是两种不同的结束状态。

子任务通过 Write 访问变量时，应把变量保留在原处，直到 `await` 或 `close` 完成。纯 Read 值是快照；借用的 `str`、切片、指针和可调用视图不作为异步输入。工作需要保留文本时，用 Take 传入管理自己文本存储的 `String`。

## 在运行时测试中直接等待

将下面的独立示例保存为 async_test.cv：

```carven
import std::async using yield_once;

async fn next(value: i32) -> i32 {
    await yield_once();
    return value + 1;
}

async test "child completes" {
    async let child = next(41);
    check(await child == 42);
}
```

运行 `carven interpret --tests async_test.cv`，或把该文件加入[普通应用目标的源码](/zh/learn/testing/#运行原生项目测试)，再运行 `carven test`。异步测试顺序执行，可以直接 `await`，不需要声明异步 `main`。

## 在编译期检查异步算法

```carven
import std::async using { when_all, yield_once }

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

保存为 async_tests.cv，运行 `carven check async_tests.cv`，执行这个包含 `await` 的静态测试。运行时测试可写为 `async test`，直接在体内 `await`。每条测试有独立根任务，在下一条测试开始前关闭子任务。`require` 失败或 `fail` 会停止当前测试及其子任务。`const async test` 则显式选择与 `const test` 相同的静态阶段。静态与解释执行规则见[异步参考](/zh/reference/async/)。

完成库存练习后，继续[JSON 输入项目](/zh/learn/data-pipeline/)，把这些操作与真实输入结合。

## 练习

给组合程序加入第四笔小计，并更新相应的嵌套元组绑定。在 cancel_work.cv 中，把 `let finished = &&completed;` 移到 `close` 之前，检查借用冲突诊断。在 select_result.cv 中，让第一个候选可用，比较两种选择操作的结果。加入静态测试，分别验证 `when_all()` 返回 `()`、单个输入返回单元素元组。
