---
title: "编译期准备"
description: "提前准备路由表和默认配置，在启动前测试，并在运行时复用同一算法。"
section: learn
lesson: 13
source: docs/language/constants.md
---

路由列表、限额、默认配置等输入，往往在程序启动前就已经确定。可以在编译时算好并测试结果，再让程序直接使用。计算仍使用前面学过的值、循环与失败处理。

## 编写并验证同一个算法

保存为 routes.cv。只保留启用且路径以 `/` 开头的路由。starts_with 检查前缀，其余是普通筛选循环。新增的两个写法是：const fn 允许编译时调用函数，const test 在编译时检查结果：

```carven run
import std::utf using starts_with;

struct Route {
    path: String,
    enabled: bool,
}

const fn enabled_paths(routes: [Route]) -> Vector<String> {
    var result: Vector<String> = [];
    for route in routes {
        if route.enabled && starts_with(route.path, "/") {
            result.push(route.path);
        }
    }
    return &&result;
}

const routes: Vector<Route> = [
    { path: "/health", enabled: true },
    { path: "/users", enabled: true },
    { path: "/debug", enabled: false },
    { path: "missing-slash", enabled: true },
];
const paths = enabled_paths(routes);

const test "enabled absolute paths" {
    check(paths.length() == 2);
    check(paths[0] == "/health");
    check(paths[1] == "/users");
}

for path in paths {
    println(path);
}
```

依次输出 `/health` 和 `/users`。它直接构造长度可变的 Vector，无须另外计算长度或声明最大容量的结果数组。`[Route]` 参数借用输入，返回的向量保存所选路径的独立副本。

`const fn` 允许编译期执行；在普通运行时初始化式中调用 `enabled_paths(routes)` 仍在运行时执行。计算阶段由调用上下文决定。支持的操作与执行限制见[常量参考](/zh/reference/constants/)。

## 构造经过检查的配置

把这个独立程序保存为 config.cv。在编译期解析默认 JSON 配置，再修改运行时副本。`Value::parse` 创建数据树，get 取得成员，as_i64 读取其中的整数。set 用一个 JSON 值替换成员，to_json 则把整棵树序列化为 String：

```carven run
import std::json using Value;

const defaults = Value::parse(r#"{"retries":3,"enabled":true}"#)?;
const compact = defaults.to_json()?;

const test "configuration" {
    let retries = try {
        defaults.get("retries")?.as_i64()?
    } catch {
        _ => fail("configuration must contain integer retries"),
    };
    check(retries == 3);
    check(compact == r#"{"retries":3,"enabled":true}"#);
}

var active = defaults;
active.set("retries", &&Value::integer(5))?;
println(compact);
println(active.to_json()?);
```

执行 `carven config.cv`，输出：

```text
{"retries":3,"enabled":true}
{"retries":5,"enabled":true}
```

`const` 初始化式要求编译期执行。JSON 操作遵循普通类型化失败规则：已知有效的输入也仍需要 `?`。要求编译期完成的计算若失败且没有恢复，编译就会失败。配置测试用 catch 与 fail，把意外的解析失败变成明确的测试失败。

准备完成后，compact 仍是 String，defaults 仍是 Value。把 defaults 复制给 active，运行中的程序便得到自己的可编辑配置。`Value::integer(5)` 构造 JSON 数值，`&&` 通过 set 把它转移给 active。因此这次修改只改变 active，不影响 defaults 或 compact。

## 在编译期处理解析失败

把这个独立程序保存为 port_config.cv：

```carven run
import std::core using NumberParseError;

const fn configured_port(text: str) -> u16 => try {
    u16::parse(text)?
} catch {
    NumberParseError(_) => 8080,
};

const port = configured_port("invalid");

const test "fallback port" {
    check(port == 8080);
}

println(port);
```

输出 `8080`：解析器拒绝无效配置，catch 在编译期提供回退值。测试中也必须处理解析器声明的失败：

```carven
const test "parse an explicit port" {
    let port = try {
        u16::parse("443")?
    } catch {
        _ => fail("443 must fit u16"),
    };
    check(port == 443);
}
```

把这段测试追加到上一个程序。它在检查时执行，不生成运行时测试函数。

## 用 `const` 块执行编译期语句

把这个独立程序保存为 prepare.cv：

```carven run
const "prepare data" {
    var labels: Vector<String> = ["health", "users"];
    labels.push("metrics");
    println("Preparing", labels.length(), "routes");
}

println("Running");
```

`carven check prepare.cv` 在分析时输出 `Preparing 3 routes`，随后报告检查通过。`carven prepare.cv` 还会从运行时入口输出 `Running`。编译期间打印保持所选的 stdout 或 stderr 通道。`compile --stdout` 把所有编译期程序输出改送 stderr，让 stdout 只包含产物列表。

标签可省略，用于在诊断中标识代码块。模块级静态代码块执行一次，可以读取常量，不能读取运行时值。执行顺序与函数内代码块的规则见[常量参考](/zh/reference/constants/)。

## 特化运行时工作

`const` 参数确定函数的一个特化实例，其他输入仍是运行时值：

```carven run
fn weighted(value: i32, const (count, weight): (i32, i32)) -> i32 {
    const { println("Preparing weights", count, weight); }

    var total = value;
    const for index in 0..count {
        total += weight + index;
    }
    return total;
}

println(weighted(10, (3, 2)), weighted(20, (3, 2)));
```

运行时输出 `19 29`。元组参数为静态的 count 和 weight 分别命名。即使调用两次，静态块也只为 `(3, 2)` 实例执行一次。静态参数不出现在运行时签名里。`const for` 展开经过检查的范围，每次迭代提供静态索引。

`const fn` 与静态参数用途不同：前者允许静态执行，后者在特化期间固定输入。无需展开或静态值时使用普通循环。

## 用 `const if` 选择编译期分支

固定的除数可以决定缩放系数。这里约定除数为零时关闭缩放，直接返回零；其他情况在编译期计算系数。把这个独立程序保存为 `scaling.cv`：

```carven run
fn scale(value: i32, const divisor: i32) -> i32 {
    const if divisor == 0 {
        return 0;
    } else {
        const factor = 100 / divisor;
        return value * factor;
    }
}

println(scale(2, 0), scale(2, 4));
```

运行 `carven scaling.cv` 或 `carven interpret scaling.cv`，输出 `0 50`。`const if` 为每个静态实参选择分支。除数为零的实例跳过另一个分支里的 `100 / divisor`。每个源码分支仍接受类型、失败与所有权检查。静态选择的完整规则见[常量参考](/zh/reference/constants/)。

## 练习

在 routes.cv 中加入启用的 `/metrics` 路由并更新静态测试。在 port_config.cv 中把配置文本改成 `"65536"`，确认解析选择回退值。分别运行 `carven check routes.cv` 与 `carven check port_config.cv` 执行静态测试，再运行两个程序检查运行时输出。
