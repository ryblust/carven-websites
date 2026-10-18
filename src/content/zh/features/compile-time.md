---
title: "在程序运行前准备数据"
description: "解析配置、保留结果，并在编译期和运行时验证同一套算法。"
section: compile-time
source: docs/language/constants.md
---

## 提前准备配置模板

程序每次启动时可能使用同一份配置模板。可以在编译期解析这份固定输入，等运行中的程序需要修改时，再创建独立副本。

下面的 `const defaults` 要求编译器立即解析 JSON。`configure` 是普通函数，在运行时复制模板并应用设置；`const test` 检查解析后的模板是否具有预期的 worker 数量。

```carven run
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

解析后的模板保留 `Value` 类型及完整内容。`var config = defaults` 创建独立副本，供运行中的程序修改。用循环和可变局部值构造查找表时，也可以采用这个方式。其他结果类型与借用视图见[常量结果与底层存储](/zh/reference/constants/#常量结果与底层存储)。

## 选择执行阶段

`const fn` 允许函数在编译期执行，由调用位置选择执行阶段。这个例子的 `const defaults` 要求在编译期解析，普通的 `configure` 调用则在程序运行时执行。常量块、静态测试、支持的操作及执行预算见[编译期计算参考](/zh/reference/constants/)。

## 用已知配置特化运行时工作

有时提前知道的只有配置。[静态参数](/zh/reference/functions/#静态参数)固定这个输入，其他参数仍接收运行时数据。

[编号示例](/zh/playground/#example=specialization) 把 `INV-DDDD` 固定为模式，再在运行时检查输入文本。

## 在两个阶段验证完整算法

[音频混音器](https://github.com/ryblust/carven/tree/main/examples/audio_mixer) 用同一个 `const fn` 完成 SIMD 混音、限幅和统计。静态测试检查不足一块的尾部，运行时测试还覆盖非法增益和轨道长度不一致。

[异步作用域示例](/zh/playground/#example=async-scope) 则在两个阶段执行完整流程：启动子任务，让它运行，取消并等待清理。静态测试检查的结果与程序运行时输出的结果相同。
