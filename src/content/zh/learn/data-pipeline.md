---
title: "项目：校验并汇总 JSON 输入"
description: "读取 JSON 记录，说明拒绝原因，并在不中断其他记录的情况下汇总合法金额。"
section: learn
lesson: 18
source: docs/language/json.md
---

## 定义输入与输出契约

每行读取一个 JSON 对象。对象必须包含 0 到 1000000 的整数 amount。接受有效记录。遇到无效记录时，把原因报告到 stderr，然后继续处理下一条。EOF 时向 stdout 输出一条 JSON 汇总。

把金额校验与读取分开，就能不依赖整条输入流而测试单条记录。stdout 保存供其他程序读取的汇总，stderr 则显示给人看的拒绝说明。

amount_of 解析并检查一条记录，main 逐行读取并累计合法金额，summary 构造最终 JSON。末尾两条测试直接检查 amount_of。把完整文件保存为 ledger.cv：

```carven
import std::io using IOError;
import std::json using { Value, JSONError, ValueError };

struct InvalidAmount {
    amount: i64,
}

const fn amount_of(text: str) -> i64 throw JSONError + ValueError + InvalidAmount {
    let record = Value::parse(text)?;
    let field = record.get("amount")?;
    let amount = field.as_i64()?;
    if amount < 0 || amount > 1000000 {
        throw InvalidAmount { amount };
    }
    return amount;
}

const fn summary(count: usize, total: i64) -> String throw ValueError {
    var result = Value::object();
    result.set("count", &&Value::unsigned_integer(count as u64))?;
    result.set("total", &&Value::integer(total))?;
    return result.to_json()?;
}

async fn main() throw IOError + ValueError {
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
                    ValueError(_) => eprintln("Expected an object with an integer amount"),
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
carven ledger.cv < input.ndjson
carven interpret ledger.cv < input.ndjson
```

stdout 输出：

```json
{"count":2,"total":2000}
```

stderr 另报告 `Amount outside policy: -1`，编译器状态或诊断行也可能写入这个通道。`carven check ledger.cv` 执行两个静态测试，不消费 stdin，也不执行 main。

## 在每个边界拥有数据

read_line 返回冷操作。await 后得到 `.Data(String)` 或 `.End`。空行是数据，会在 JSON 解析时失败，不是 EOF。LF 及其前面的 CR 被移除；最后一行没有换行也会返回一次。4096 限制按内容字节计数，不按 Unicode 字符计数。

每行拥有自己的字节。Value::parse 构造独立 JSON 树；get 返回独立子值。amount_of 返回数字，因此没有借用视图离开调用，也无需跨迭代保留输入缓冲区。

summary 新建 JSON 对象，并把 count 与 total 放进去。插入顺序使 count 在 total 前。JSON 写出产生独立 String。JSON 数字保留原始拼写；as_i64 有意拒绝浮点拼写和超出 i64 的值，不会静默舍入。

## 区分数据不合法与输入不可用

每条记录的 try 只处理数据失败。缺少键、根类型不符或金额非整数属于 ValueError；语法损坏属于 JSONError；可表示但超出业务范围的整数属于 InvalidAmount。

IOError 从 main 传播，因为输入源不可用、UTF-8 无效、行过长都需要在流级别作决定。行限制失败保留缓冲输入，使用相同上限盲目重试不会推进。应选择更大上限、切换原始分块恢复，或停止。本程序选择停止，让入口报告类型化失败并返回失败状态。

整数运算回绕，所以运行总计在加法前用断言检查剩余范围。这个例子把账本容量耗尽视为不变量失败，不提供自动回滚或捕获。需要可恢复容量拒绝的服务应声明独立失败，并测试对应策略。接受记录计数也假设输入条数可由 usize 表示。

## 把校验变成可复用的准备工作

同一个 amount_of 在编译期和运行时执行。静态测试覆盖成功与策略失败；继续加入损坏 JSON、缺失 amount、小数拼写和最大合法值。测试里处理每个声明的失败。

添加普通运行时 test 后，用 `carven --tests ledger.cv` 执行。测试跳过应用入口。入口保持为读取、校验、累计、写出的小流程；解析与汇总构造可以不依赖 stdin 而复用。

## 换用其他输入源

单个有上限的文档可用 `await stdin().read_text(limit)?`；任意字节块可用 read(max_bytes) 或 read_all(limit)。记录跨块时，`std::io` 提供 ByteLines 与 LineFramer。需要独立恢复无效记录时，先按字节分帧，再验证完整记录的 UTF-8。

同样的分帧与解析核心可处理 std::net 的 TCP 块。原生 C++ 宿主必须提供连接与事件源，维持生命周期并驱动导出的异步根。写入可能只完成一部分；`write_all(view, &&bytes)` 保留拥有缓冲区直到完成。这里的网络能力不包括建立连接、DNS 或 TLS。改写前先查看[标准库参考](/zh/reference/library/)。

## 练习

加入必需的 category 字符串，为两个已知分类分别累计。保留 JSON 借用字符串前，先复制成 String。stdout 专用于结果，拒绝原因写到 stderr。加一条测试证明拒绝记录不改变任何总计，再测试没有最终换行的 EOF。
