---
title: "时间与截止时间"
description: "时间间隔的范围检查、单调时钟、可取消等待与 timeout 组合。"
section: reference
lesson: 28
source: docs/language/time.md
---

需要表达“等 250 毫秒”时用 `Duration`；需要表达“等到这个时刻”时用 `TimePoint`；需要为一个操作设置截止时间时用 `timeout`。这里使用单调时钟来测量经过的时间，不表示日期、时区或日历时间。

## 类型与导入

从 `std::time` 导入使用的类型和函数。`Duration`、`TimePoint`、`RangeError`、`Timeout` 由标准源码模块声明。时间间隔字面量无需导入 `Duration` 名字；名字选择规则见[模块导入](/zh/reference/modules/)。

## 时间间隔

`Duration` 是含公开 `nanoseconds: i64` 字段的名义结构体。`i64` 范围内的负数、零和正数均有效，使用普通构造、复制与字段修改规则。`RangeError` 是表示单位缩放或时间点加法不可表示的空结构体。

| 函数                                   | 结果             | 失败         |
| -------------------------------------- | ---------------- | ------------ |
| `nanoseconds(value: i64) -> Duration`  | 原纳秒值         | 无           |
| `microseconds(value: i64) -> Duration` | 乘 1,000         | `RangeError` |
| `milliseconds(value: i64) -> Duration` | 乘 1,000,000     | `RangeError` |
| `seconds(value: i64) -> Duration`      | 乘 1,000,000,000 | `RangeError` |

这些函数都是 `const fn`，在乘法前检查 `i64` 范围。`100ms` 等字面量构造相同的 `Duration` 类型，并在编译期检查缩放。动态值使用 `milliseconds(value)?`；用纳秒表示不意味着操作会精确到纳秒唤醒。

```carven run
import std::time using { Duration, milliseconds };

const delay: Duration = milliseconds(250)?;
println(delay.nanoseconds); // 250000000
```

## 单调时间点

`TimePoint` 是用 Carven 源码定义的类，内部表示私有，支持普通复制与访问；不暴露时钟起点，也不表示日历时间。

| 操作                                                | 契约                                   | 失败         |
| --------------------------------------------------- | -------------------------------------- | ------------ |
| `TimePoint::now() -> TimePoint`                     | 读取一次单调时钟                       | 无           |
| `TimePoint::after(duration: Duration) -> TimePoint` | 读取一次再加间隔                       | `RangeError` |
| `point.shifted(duration: Duration) -> TimePoint`    | 不读取时钟，平移已有时间点             | `RangeError` |
| `point.is_before(other: TimePoint) -> bool`         | 比较存储的两个时间点                   | 无           |
| `point.has_passed() -> bool`                        | 与当前时钟比较                         | 无           |
| `point.wait() -> Operation<void>`                   | 保存截止时间，返回冷 `Operation<void>` | 无           |

实例方法均使用 Read 接收者，`now` 和 `after` 是关联函数。时间点加法会检查溢出，拒绝超出有符号 `i64` 纳秒范围的结果。这些操作支持 `const`；时钟由当前执行宿主提供。比较与等待需要同一时钟域。冻结的编译期时间点保留编译器宿主读数，不能假定它在另一宿主或重启后仍有意义。

## 执行阶段

时间 API 支持编译期、解释和原生执行，包括时钟、等待及 `timeout`。每种方式使用实际执行进程的时钟与计时器，见[执行阶段](/zh/reference/constants/#执行阶段)。

构造冷操作不注册计时器。操作不能保留为模块常量，但可以在一次编译期求值中局部创建并 await；执行预算不限制实际等待时长。

## 可取消等待

从 `std::time` 导入 `sleep`、`sleep_until`。两者均为成功结果类型为 `void` 的 `const async fn`，调用分别返回 `Operation<void, throw RangeError>` 与 `Operation<void>`。启动或 await 时消耗该操作。

| 函数                            | 参数             | 声明的失败   |
| ------------------------------- | ---------------- | ------------ |
| `sleep(duration: Duration)`     | 相对间隔         | `RangeError` |
| `sleep_until(point: TimePoint)` | 绝对单调截止时间 | 无           |

`sleep` 在执行时先经过取消检查点，再读取时钟开始计时。非正间隔在检查后立即成功，不计算截止时间，也不会自动让出执行机会；正间隔需检查加法。

`point.wait()` 同步创建冷操作，只复制截止时间，不借用时间点、不读取时钟，也不注册计时器；等待行为与 `sleep_until` 相同。两者先接受待处理取消，再检查期限是否已到。丢弃未启动操作不会等待。

```carven run
import std::time using { TimePoint, RangeError, sleep, sleep_until };

async fn main() throw RangeError {
    await sleep(250ms)?;
    let deadline = TimePoint::after(100ms)?;
    await sleep_until(deadline);
    println("wait complete");
}
```

正常完成不早于指定时间，但调度可能推迟结果交付。取消是声明的失败集之外的完成状态。操作完成前移除计时器注册；显式调用子任务的 `close` 会等待取消清理完成，再释放保留的底层存储。

## 截止时间组合

`timeout(operation, duration)` 从 `std::time` 导入，消耗冷操作，保留其成功类型，向声明的失败集增加 `Timeout` 和 `RangeError`。`Timeout` 是独立的空结构体类型。必须直接调用；具名冷操作使用 `&&` 转移，不能传子任务。

构造不执行操作、不读取时钟。执行时先接受待处理取消；非正间隔直接产生 `Timeout`，不启动工作或读取时钟。正间隔在启动子操作前计算固定的单调时钟截止时间，加法越界为 `RangeError`。

待执行操作先于计时器入队。哪一方先报告完成，就选择哪一方；如果两者都已经完成，优先选择原操作。选择之前，以及观察到所选结果之后、确定对外结果之前，都会检查父任务的取消请求。选择原操作时，返回其成功、失败或取消状态，包括支持的不可移动原生结果；选择计时器时，产生 `Timeout`。交付结果前会关闭两个子任务。对外结果一旦确定，晚到的取消或失败不会替换它。若原操作不配合取消，关闭过程可能超过截止时间。

```carven run
import std::time using { timeout, RangeError, Timeout };

async fn load() -> i32 => 7;

async fn main() throw Timeout + RangeError {
    println(await timeout(load(), 100ms)?);
}
```

## 原生宿主

生成的入口在同一线程执行就绪工作，空闲时等待最近计时器，没有后台计时线程。原生接口以有符号 64 位整数表示从 steady clock 起点经过的纳秒数。原生时钟每个 tick 必须是正整数纳秒，读数必须在该整数范围内；转换时使用溢出检查，并将等待期限向后取整到原生时钟的刻度。

原生取消通过驱动线程上的 `request_cancel()` 记录请求，并通知正在等待的计时器；直接修改请求标志不会发出该通知。关闭期间会保留事件注册和借用资源，直到原生实现不会再访问相关操作的完成状态。
