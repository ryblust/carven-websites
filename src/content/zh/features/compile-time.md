---
title: "在程序运行前准备数据"
description: "解析配置、保留结果，并在编译期和运行时验证同一套算法。"
section: compile-time
source: docs/language/constants.md
---

## 提前准备配置模板

程序每次启动时可能使用同一份配置模板。可以在编译期解析这份固定输入，等运行中的程序需要修改时，再创建独立副本。

下面的 `const defaults` 要求编译器立即解析 JSON。`configure` 是普通函数，在运行时复制模板并应用设置；`const test` 检查解析后的模板是否具有预期的工作单元数量。

```carven
import std::json using { Value, ValueError };

const defaults = Value::parse(r#"{"workers":2,"tags":["stable"]}"#)?;

fn configure(workers: i64) -> String throw ValueError {
    var config = defaults;
    config.set("workers", &&Value::integer(workers))?;
    var tags = config.get("tags")?;
    tags.push(&&Value::string("observed"))?;
    config.set("tags", &&tags)?;
    return config.to_json()?;
}

const test "the template starts with two workers" {
    check(try {
        defaults.get("workers")?.as_i64()? == 2
    } catch { ValueError(_) => false });
}

println(configure(8)?);
println(defaults.to_json()?);
```

运行时先输出修改后的副本，再输出原模板：

```text
{"workers":8,"tags":["stable","observed"]}
{"workers":2,"tags":["stable"]}
```

`Value` 拥有自己的字符串和集合，因此两棵树可以独立修改。`get("tags")` 返回的子值也是独立副本，追加标签后，要用 `set` 把修改后的子值放回配置。`&&` 将子值转移给接收它的容器。

[运行配置示例](/zh/playground/#example=json-config)，修改数量或添加标签，再比较两行输出。JSON 库的解析、修改和写出函数都是 `const fn`，同样的操作可以在两个阶段执行。

## 保留结果的类型

常量初始化结束时，Carven 冻结结果，也就是保留一个供后续使用的不可变值。拥有的 `String` 仍然是 `String`，`Vector<T>` 保留元素和容量，嵌套 JSON 值保留它们拥有的内容。复制到可变绑定后，会得到独立存储。

显式 `str` 目标可以选择保留完成文本的视图，其字节具有程序生命周期。普通借用仍然遵守生命周期规则：函数不能返回指向局部所有者的视图。

这样可以用普通循环和可变局部值构造查找表、Unicode 文本或配置，再保留结果，无需另外编写静态表示。

## 选择执行阶段

`const fn` 让函数能够在编译期执行。`const` 初始化器要求这种执行并保留结果；`const { ... }` 执行不保留结果的编译期工作；`const test` 在检查时运行断言，`carven check` 也会执行。同一函数的普通调用仍在运行时执行，即便传入字面量也是如此。

编译器检查 `const fn` 及其可达调用是否支持所选阶段。显式静态执行也能使用编译器进程的输入、时钟、等待和输出。这些效果发生在编译过程中，已经完成的效果不会因后续失败而撤销。

执行受步骤、文本和聚合工作预算限制。外部 C++ 调用需要原生执行，形成类型的查询对宿主效果还有额外限制。[常量参考](/zh/reference/constants/) 给出这些规则与完整操作范围。

## 用已知配置特化运行时工作

有时提前知道的只有配置。`const` 参数固定这个输入，其他参数仍接收运行时数据。`const if` 为实例选择分支，`const for` 展开静态序列。所有源分支仍接受类型、访问和失败检查。

[编号示例](/zh/playground/#example=specialization) 把 `INV-DDDD` 固定为模式，再在运行时检查输入文本。SIMD 提取也能用同样方式固定偏移。格式化可以提前准备固定文本和数字格式，把变化的值留到运行时转换。

## 在两个阶段验证完整算法

[音频混音器](https://github.com/ryblust/carven/tree/main/examples/audio_mixer) 用同一个 `const fn` 完成 SIMD 混音、限幅和统计。静态测试检查不足一块的尾部，运行时测试还覆盖非法增益和轨道长度不一致。[日志分析器](https://github.com/ryblust/carven/tree/main/examples/log_analyzer) 在编译期检查凭据脱敏，并保留拥有所有权的 JSON 报告模板。

[异步作用域示例](/zh/playground/#example=async-scope) 则在两个阶段执行完整流程：启动子任务，让它运行，取消并等待清理。静态测试检查的结果与程序运行时输出的结果相同。
