---
title: "在能够恢复的地方处理失败"
description: "拒绝坏记录、保留错误详情，并检查每个函数留给调用者的责任。"
section: failure-contracts
source: docs/language/failures.md
---

## 拒绝一条记录，继续处理下一条

日志处理器需要区分字段缺失和数字无效，但一条坏记录不应使后面的有效记录被丢弃。让解析函数描述可能发生的失败，再由逐条处理记录的循环恢复。

这里的 `RecordError` 保留应用层面的分类，`InvalidLatency` 还携带原始数字解析错误。函数签名中的 `throw RecordError` 告诉调用者可能失败的类型；每个 `?` 标记失败离开当前表达式的位置。

```carven
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

`u64::parse` 失败后，对应的 catch 分支把错误包装为 `RecordError::InvalidLatency`。外层循环处理 `RecordError`，打印被拒绝的输入，再继续下一行。有效记录的消息则被复制为拥有的 `String`，结果可以独立于输入保留。

[运行解析器](/zh/playground/#example=log-analysis)。[完整日志分析器](https://github.com/ryblust/carven/tree/main/examples/log_analyzer) 还包含字节分行、UTF-8 校验、凭据脱敏、统计和 JSON 输出。这里的小例子接收已经合法的文本，重点展示解析和逐条恢复。

## 保留独立失败，或者定义应用错误

一层函数可以用 `throw A + B` 保留独立的失败类型，让调用者直接分别恢复。上面的解析器采用另一种做法：把库失败映射为自己的 `RecordError` 成员。根据调用者需要的信息选择接口。

私有辅助函数、lambda 和隐式入口会根据调用推断失败。对其他模块可见的函数，以及显式 `main`，声明允许向外传播的集合。编译器检查函数体是否落在这个范围内。调用者遵循声明，即使当前函数体并未产生声明中的某种失败。

## 恢复一种失败，继续传播其他失败

[配置示例](/zh/playground/#example=typed-failures) 在 `Missing` 时返回默认端口，`Denied` 和 `BadPort` 仍交给调用者。编译器根据恢复行为得出剩余集合。如果函数只声明 `Denied`，实现会因 `BadPort` 仍可逃逸而被拒绝。

带守卫的分支，或者只覆盖部分载荷的模式，可能仍留下一种失败。完整覆盖才会移除它；`rethrow` 则传播原始失败。实现修改后仍须通过这些检查，因此删除恢复分支可能要求同步更新公开契约。

## 异步工作使用相同契约

`async fn` 声明成功结果及可能的失败。调用创建尚未启动的工作，`await operation()?` 等待完成后再传播失败。`when_all` 组合输入的失败集合，`first_successful` 可以在候选失败后继续等待。[运行批次工作流](/zh/playground/#example=async-workflow)。

取消是独立的完成状态。请求取消要求工作停止，子任务关闭则等待工作和清理完成，再释放借用的数据。因此，超时可以选中 `Timeout`，但清理仍然可能耗时。[异步教程](/zh/learn/async/) 解释这段生命周期。

## 区分恢复与停止执行

类型化失败用于调用者可以处理的条件。`assert` 报告被破坏的不变量并停止执行，`check` 报告测试断言失败。执行器预算耗尽和非法运行时操作不会变成 catch 可以恢复的失败。

如果需要恢复 C++ 异常，原生适配器应先捕获它，再返回明确结果或 Carven 失败。异常逃出生成的 `noexcept` 边界会终止。见[互操作](/zh/learn/interop/)中的原生边界，以及[失败参考](/zh/reference/failures/)中的传播和覆盖规则。

生成的 C++ 用结果载体和分支实现这些选择。C++23 的 `std::expected`、`std::variant` 和库组合器可以提供相应的结果与控制流；Carven 把失败组合和覆盖作为语言规则检查。
