---
title: "在能够恢复的地方处理失败"
description: "拒绝坏记录、保留错误详情，并检查每个函数留给调用者的责任。"
section: failure-contracts
source: docs/language/failures.md
---

## 拒绝一条记录，继续处理下一条

日志处理器需要区分字段缺失和数字无效，但一条坏记录不应使后面的有效记录被丢弃。让解析函数描述可能发生的失败，再由逐条处理记录的循环恢复。

这里的 `RecordError` 保留应用层面的分类，`InvalidLatency` 还携带原始数字解析错误。函数签名中的 `throw RecordError` 告诉调用者可能失败的类型；每个 `?` 标记失败离开当前表达式的位置。

```carven run
import std::core using NumberParseError;
import std::utf using { split_once, TextError };

enum RecordError {
    Shape,
    InvalidLatency(NumberParseError),
    TextProcessing(TextError)
}

struct Record { milliseconds: u64, message: String }

fn parse_record(text: str) -> Record throw RecordError {
    try {
        let fields = split_once(text, " ")?;
        if !fields.found { throw RecordError::Shape; }
        return {
            milliseconds: u64::parse(fields.before)?,
            message: fields.after as String,
        };
    } catch {
        NumberParseError(error) => throw RecordError::InvalidLatency(error),
        TextError(error) => throw RecordError::TextProcessing(error),
    }
}

for line in ["37 token=[redacted]", "nope malformed", "42 超时"] {
    try {
        let record = parse_record(line)?;
        println(f"{record.milliseconds}ms: {record.message}");
    } catch {
        RecordError(_) => println("rejected:", line),
    }
}
```

程序输出两条有效记录，并报告被拒绝的行：

```text
37ms: token=[redacted]
rejected: nope malformed
42ms: 超时
```

`u64::parse` 失败后，对应的 catch 分支把错误包装为 `RecordError::InvalidLatency`。外层循环处理 `RecordError`，打印被拒绝的输入，再继续下一行。有效记录的消息则被复制到具有独立存储的 `String` 中，结果可以独立于输入保留。

[运行解析器](/zh/playground/#example=log-analysis)。[完整日志分析器](https://github.com/ryblust/carven/tree/main/examples/log_analyzer) 还包含字节分行、UTF-8 校验、凭据脱敏、统计和 JSON 输出。这里的小例子接收已经合法的文本，重点展示解析和逐条恢复。

## 保留独立失败，或者定义应用错误

一层函数可以用 `throw A + B` 保留独立的失败类型，让调用者直接分别恢复。上面的解析器采用另一种做法：把库失败映射为自己的 `RecordError` 成员。根据调用者需要的信息选择接口。

哪些位置需要声明失败集合、哪些可以推断，见[失败参考](/zh/reference/failures/)。

处理分支可以恢复当前层能够处理的失败，把其他失败留给调用者。覆盖规则、带守卫的模式与 `rethrow` 见[部分 catch 与剩余集合](/zh/reference/failures/#部分-catch-与剩余集合)。

异步函数使用相同的失败契约：`await operation()?` 等待完成后传播失败。[批次工作流](/zh/playground/#example=async-workflow)将其用于多个操作。组合、取消与清理规则见[异步参考](/zh/reference/async/)。

## 区分恢复与停止执行

类型化失败用于调用者可以处理的条件，断言用于检查不变量。[失败与终止规则](/zh/reference/failures/)区分可恢复的失败与执行终止，[C++ 互操作](/zh/reference/interop/#noexcept)说明原生异常的处理。
