---
title: "项目：JSON 输入"
description: "读取 JSON 记录，说明拒绝原因，并在不中断其他记录的情况下汇总合法金额。"
section: learn
lesson: 18
source: docs/language/json.md
---

## 定义输入与输出契约

每行读取一个 JSON 对象。对象必须包含 0 到 1000000 的整数 amount。接受有效记录。遇到无效记录时，把原因报告到 `stderr`，然后继续处理下一条。EOF 时向 `stdout` 输出一条 JSON 汇总。

把金额校验与读取分开，就能不依赖整条输入流而测试单条记录。`stdout` 输出供其他程序读取的汇总，`stderr` 则显示给人看的拒绝说明。

`amount_of` 解析并检查一条记录，`main` 逐行读取并累计合法金额，`summary` 构造最终 JSON。末尾两条测试直接检查 `amount_of`。把完整文件保存为 ledger.cv：

```carven
import std::io using IOError;
import std::json using { JSONValue, JSONError, JSONValueError }

struct InvalidAmount {
    amount: i64,
}

const fn amount_of(text: str) -> i64 throw JSONError + JSONValueError + InvalidAmount {
    let record = JSONValue::parse(text)?;
    let field = record.get("amount")?;
    let amount = field.as_i64()?;
    if amount < 0 || amount > 1000000 {
        throw InvalidAmount { amount };
    }
    return amount;
}

const fn summary(count: usize, total: i64) -> String throw JSONValueError {
    var result = JSONValue::object();
    result.set("count", &&JSONValue::unsigned_integer(count as u64))?;
    result.set("total", &&JSONValue::integer(total))?;
    return result.to_json()?;
}

async fn main() throw IOError + JSONValueError {
    let input = stdin().with_line_limit(4096);
    var accepted: usize = 0;
    var total: i64 = 0;

    while {
        match await input.read_line()? {
            .End => break,
            .Data(line) => {
                try {
                    let amount = amount_of(line)?;
                    assert(total <= 9223372036854775807i64 - amount, "ledger total overflow");
                    total += amount;
                    accepted += 1;
                } catch {
                    JSONError(error) => eprintln("Invalid JSON at byte", error.offset),
                    JSONValueError(_) => eprintln("Expected an object with an integer amount"),
                    InvalidAmount(error) => eprintln("Amount outside policy:", error.amount),
                }
            },
        }
    }

    println(summary(accepted, total)?);
}

const test "valid amount" {
    let amount = try {
        amount_of(r#"{"amount":1250}"#)?
    } catch {
        _ => fail("valid record must succeed"),
    };

    check(amount == 1250);
}

const test "negative amount is a policy failure" {
    try {
        amount_of(r#"{"amount":-1}"#)?;
        fail("negative amount must fail");
    } catch {
        InvalidAmount(error) => check(error.amount == -1),
        _ => fail("expected InvalidAmount"),
    }
}
```

创建 input.ndjson：

```json
{"amount":1250}
{"amount":-1}
{"amount":750}
```

用原生或受支持的解释执行运行：

```sh
carven run ledger.cv < input.ndjson
carven interpret ledger.cv < input.ndjson
```

`stdout` 输出：

```json
{"count":2,"total":2000}
```

`stderr` 另报告 `Amount outside policy: -1`，编译器状态或诊断行也可能写入这个通道。`carven check ledger.cv` 执行两个静态测试，不读取 `stdin`，也不执行 `main`。

## 让每条记录使用独立数据

read_line 返回冷操作。`await` 后得到 `.Data(String)` 或 `.End`。空行是数据，会在 JSON 解析时失败，不是 EOF。LF 及其前面的 CR 被移除；最后一行没有换行也会返回一次。4096 限制按内容字节计数，不按 Unicode 字符计数。

每行 `String` 管理自己的文本存储。`JSONValue::parse` 构造独立 JSON 树；`get` 返回独立子值。`amount_of` 返回数字，因此没有借用视图离开调用，也无需跨迭代保留输入缓冲区。

`summary` 用 `JSONValue::object()` 创建空 JSON 对象。`set` 插入键，并通过 `&&` 接收对应的值；`JSONValue::integer` 和 `JSONValue::unsigned_integer` 构造 JSON 数值。先插入 count，再插入 total，因此输出按这个顺序排列成员。`to_json` 把完整 JSON 返回为 `String`。

## 区分数据不合法与输入不可用

每条记录的 try 只处理数据失败。缺少键、根类型不符或金额非整数属于 `JSONValueError`；语法损坏属于 `JSONError`；可表示但超出业务范围的整数属于 `InvalidAmount`。

`IOError` 从 `main` 传播，因为输入源不可用、UTF-8 无效、行过长都需要由整个输入流程决定如何处理。行过长时，缓冲区中的输入会保留；使用相同上限重试仍会遇到同样的限制。可以增大上限，改为读取原始字节块并恢复，或停止处理。本程序选择停止，让入口报告类型化失败并返回失败状态。

整数运算会回绕，因此在累计金额前，用断言检查剩余范围。总额超出 `i64` 时，本例停止执行；记录计数则假设在 `usize` 范围内。

## 在编译期和运行时复用校验

同一个 `amount_of` 在编译期和运行时执行。静态测试覆盖成功与策略失败；继续加入格式错误的 JSON、缺失 amount、小数写法和最大合法值。测试里处理每个声明的失败。

添加普通运行时 test 后，用 `carven interpret --tests ledger.cv` 执行。测试跳过应用入口。入口保持为读取、校验、累计、写出的小流程；解析与汇总构造可以不依赖 `stdin` 而复用。

## 换用其他输入源

需要读取完整文档或字节块时，在[输入参考](/zh/reference/io/)中选择相应操作。其中也介绍了跨字节块分帧，以及分别验证每条记录 UTF-8 的方法。

改用 TCP 输入时，查阅[网络参考](/zh/reference/net/)中的连接准备、宿主集成和生命周期要求。

## 练习

加入必需的 category 字符串，为两个已知分类分别累计。保留 JSON 借用字符串前，先复制成 `String`。`stdout` 专用于结果，拒绝原因写到 `stderr`。加一条测试证明拒绝记录不改变任何总计，再测试没有最终换行的 EOF。

接着学习 [Carven 语言服务器](/zh/learn/lsp/)，把 JSON、字节流和异步任务用于一个开发工具。
