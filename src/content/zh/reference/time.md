---
title: "时间与截止时间"
description: "检查时间间隔、单调时间点、可取消等待与 timeout 组合。"
section: reference
lesson: 29
source: docs/language/time.md
---

需要表达“等 250 毫秒”时用 Duration；需要表达“等到这个时刻”时用 TimePoint；需要为一个操作设置截止时间时用 timeout。这里使用单调时钟来测量经过的时间，不表示日期、时区或日历时间。

## 类型与导入

从 `std::time` 导入使用的类型和函数。`Duration`、`TimePoint`、`RangeError`、`Timeout` 由标准源码模块声明。导入操作不会同时绑定其签名中的类型；显式写类型注解或失败声明时需要单独导入。时间间隔字面量无需 `Duration` 名字。

## 时间间隔

`Duration` 是含公开 `nanoseconds: i64` 字段的名义结构体。完整负数范围、零和正数均有效，使用普通构造、复制与字段修改规则。`RangeError` 是表示单位缩放或时间点加法不可表示的空结构体。

| 函数                       | 结果             | 失败         |
| -------------------------- | ---------------- | ------------ |
| `nanoseconds(value: i64)`  | 原纳秒值         | 无           |
| `microseconds(value: i64)` | 乘 1,000         | `RangeError` |
| `milliseconds(value: i64)` | 乘 1,000,000     | `RangeError` |
| `seconds(value: i64)`      | 乘 1,000,000,000 | `RangeError` |

这些函数都是 `const fn`，在乘法前检查 `i64` 范围。`100ms` 等字面量构造相同名义类型，并在编译期检查缩放。动态值使用 `milliseconds(value)?`；纳秒表示精度不承诺唤醒精度。

```carven
import std::time using { Duration, milliseconds };

const delay: Duration = milliseconds(250)?;
```

## 单调时间点

`TimePoint` 是私有表示的源码类，支持普通复制与访问；不暴露时钟纪元，也不表示日历时间。

| 操作                         | 契约                                   | 失败         |
| ---------------------------- | -------------------------------------- | ------------ |
| `TimePoint::now()`           | 读取一次单调时钟                       | 无           |
| `TimePoint::after(duration)` | 读取一次再加间隔                       | `RangeError` |
| `point.shifted(duration)`    | 不读取时钟，平移已有时间点             | `RangeError` |
| `point.is_before(other)`     | 比较存储的两个时间点                   | 无           |
| `point.has_passed()`         | 与当前时钟比较                         | 无           |
| `point.wait()`               | 快照截止时间，返回冷 `Operation<void>` | 无           |

检查加法拒绝超出有符号 `i64` 纳秒范围的值。这些操作支持 `const`；时钟由当前执行宿主提供。比较与等待需要同一时钟域。冻结的编译期时间点保留编译器宿主读数，不能假定它在另一宿主或重启后仍有意义。

## 执行阶段

时间 API 支持静态执行、解释和原生执行，包括时钟、等待及 `timeout`。静态执行使用编译器进程的时钟与计时器，其余调用使用执行进程。普通调用即使参数已知仍在运行时执行。

构造冷操作不注册计时器。操作不能冻结为模块常量，但静态根可在局部构造并 await；执行预算不限制实际等待时长。

## 可取消等待

从 `std::time` 导入 `sleep`、`sleep_until`。两者返回冷 void 操作，启动或 await 时消耗。

| 函数                            | 参数             | 声明的失败   |
| ------------------------------- | ---------------- | ------------ |
| `sleep(duration: Duration)`     | 相对间隔         | `RangeError` |
| `sleep_until(point: TimePoint)` | 绝对单调截止时间 | 无           |

`sleep` 在执行时先经过取消检查点，再读取时钟开始计时。非正间隔在检查后立即成功，不做截止时间算术，也不会自动让出执行机会；正间隔需检查加法。

`point.wait()` 是同步冷工厂，复制截止时间，不保留时间点、不读取时钟、不注册计时器；能力与 `sleep_until` 相同。两者先接受待处理取消，再检查期限是否已到。丢弃未启动操作不会等待。

```carven
import std::time using { TimePoint, RangeError, sleep, sleep_until };

async fn main() throw RangeError {
    await sleep(250ms)?;
    let deadline = TimePoint::after(100ms)?;
    await sleep_until(deadline);
}
```

正常完成不早于期限，但派发可能延迟。取消是声明的失败集之外的完成状态。操作完成前移除计时器注册；显式子任务`close` 等待取消清理，再释放保留的后备存储。

## 截止时间组合

`timeout(operation, duration)` 从 `std::time` 导入，消耗冷操作，保留其成功类型，向声明的失败集增加 `Timeout` 和 `RangeError`。`Timeout` 为空名义结构体。必须直接调用；具名冷操作使用 `&&` 转移，不能传词法子任务。

构造不执行操作、不读取时钟。执行时先接受待处理取消；非正间隔直接产生 `Timeout`，不启动工作或读取时钟。正间隔在启动子操作前计算固定单调期限，加法越界为 `RangeError`。

工作先于计时器入队；终态发布选定胜者，均已终结时优先工作。父取消在选择前及观察胜者之后、提交对外结果前检查。工作获胜转发其完成；计时器获胜产生 `Timeout`。交付前两个子任务均关闭，提交后晚到取消或失败不会替换结果。非协作工作可使关闭超过期限。

```carven
import std::time using { timeout, RangeError, Timeout };

async fn load() -> i32 => 7;

async fn main() throw Timeout + RangeError {
    println(await timeout(load(), 100ms)?);
}
```

## 原生宿主

生成的入口在同一线程执行就绪工作，空闲时等待最近计时器，没有后台计时线程。原生边界用有符号 64 位 steady-clock 纳秒，原生 tick 为正整数纳秒，读数须可表示；等待期限向之后的原生 tick 取整。

原生取消通过驱动线程上的 `request_cancel()` 记录请求并通知停放计时器；只写标志不会通知。关闭期间保留注册和借用资源，直到相关完成不再可被原生实现访问。
