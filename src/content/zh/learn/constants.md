---
title: "在编译期准备配置和数据表"
description: "提前准备路由表和默认配置，在启动前测试，并在运行时复用同一算法。"
section: learn
lesson: 13
source: docs/language/constants.md
---

路由列表、限额、默认配置等输入，往往在程序启动前就已经确定。可以在编译时算好并测试结果，再让程序直接使用。计算仍使用前面学过的值、循环与失败处理。

## 编写并验证同一个算法

保存为 routes.cv。我们只想保留启用且路径以 `/` 开头的路由。starts_with 检查前缀，其余是普通筛选循环。新增的两个写法是：const fn 允许编译时调用函数，const test 在编译时检查结果：

```carven
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

依次输出 `/health` 和 `/users`。它直接构造长度可变的拥有结果，无须另外计算长度或声明最大容量的结果数组。`[Route]` 参数借用输入，返回向量则拥有所选路径的副本。

`const fn` 允许算法在编译期执行。在普通运行时初始化式中调用 `enabled_paths(routes)` 仍在运行时执行。阶段由调用上下文选择，与参数是否恰好已知无关。要求静态执行的调用只能到达显式声明为 `const fn` 的操作。定义在使用前接受检查；动态错误与执行预算在具体调用执行时检查。

## 构造经过检查的配置

同样的准备工作也能解析写在源码里的配置。Value::parse 把 JSON 文本变成独立的数据树。get 用来读取成员，set 更新成员，to_json 则写出紧凑 JSON。下面先准备默认配置，再修改运行时副本：

```carven
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

保存为 config.cv，执行 `carven config.cv`，输出：

```text
{"retries":3,"enabled":true}
{"retries":5,"enabled":true}
```

`const` 初始化式要求编译期执行。JSON 操作遵循普通类型化失败规则：已知有效的输入也仍需要 `?`。要求编译期完成的计算若失败且没有恢复，编译就会失败。配置测试用 catch 与 fail，把意外的解析失败变成明确的测试失败。

准备完成后，compact 仍是 String，defaults 仍是 Value。把 defaults 复制给 active，运行中的程序便得到自己的可编辑配置。提前准备不会改变值的类型，也不会让运行时副本共享可变内容。

## 准备期间恢复解析失败

```carven
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

输出 `8080`。数值解析检查完整输入和目标范围。空串、尾随内容或超范围数字都是类型化失败；整数转换则会回绕，并不验证范围。`const explicit_port = u16::parse("443")?;` 若解析失败且没有处理，会让编译停止。在测试内应处理每种可能失败，例如：

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

## 执行准备工作而不保留结果

```carven
const "prepare data" {
    var labels: Vector<String> = ["health", "users"];
    labels.push("metrics");
    println("Preparing", labels.length(), "routes");
}

println("Running");
```

`carven check prepare.cv` 在分析时输出 `Preparing 3 routes`，随后报告检查通过。`carven prepare.cv` 还会从运行时入口输出 `Running`。编译期间打印保持所选的 stdout 或 stderr 通道。`compile --stdout` 把所有编译期程序输出改送 stderr，让 stdout 只包含产物列表。

标签可省略，用于诊断标识。模块块执行一次。函数内的块按选中的实例或展开的 `const for` 出现次数执行。它可读取外围常量、静态参数与静态循环索引，不能读取运行时参数或局部值。普通运行时条件不选择静态工作。同一函数体内按源码顺序执行；不同函数体没有保证的准备顺序。

## 特化运行时工作

`const` 参数选择一个经过检查的特化，其他输入仍是运行时值：

```carven
fn weighted(value: i32, const weights: (i32, i32)) -> i32 {
    const { println("Preparing weights", weights.0, weights.1); }
    var total = value;
    const for index in 0..weights.0 {
        total += weights.1 + index;
    }
    return total;
}

println(weighted(10, (3, 2)), weighted(20, (3, 2)));
```

运行时输出 `19 29`。即使调用两次，静态块也只为 `(3, 2)` 实例准备一次。静态参数不出现在运行时签名里。`const for` 展开经过检查的范围，每次迭代提供静态索引。`const if` 选择生成的函数里保留哪个分支，但每个源码分支仍须包含合法代码。

`const fn` 与静态参数用途不同：前者允许静态执行，后者在特化期间固定输入。无需展开或静态值时使用普通循环。

## 在相同阶段使用文本、SIMD 和异步操作

UTF 编码、验证、拆分，JSON 构造，向量和已支持的类操作都可显式静态执行。SIMD 算法在两个阶段遵循相同的逻辑通道契约：

```carven
import std::simd.bytes using { block_count, load_block };

const fn count_byte(bytes: [u8], needle: u8) -> usize {
    var count: usize = 0;
    for index in 0..block_count(bytes) {
        let block = load_block(bytes, index * 32);
        count += ((block.value == needle) & block.active).count();
    }
    return count;
}

const zeros = count_byte("A\0B".bytes, 0);
const test { check(zeros == 1); }
println(zeros);
```

输出 `1`。与 active 通道相与排除最后一块补零。逻辑 SIMD 宽度不承诺单个硬件寄存器或性能提升。

编译期块或测试也能等待声明为 `const async fn` 的受支持操作；[异步课程](/zh/learn/async/) 将介绍这些语法。静态时钟与输入观察编译器进程，因此会使准备依赖该宿主。执行预算不提供墙钟超时。需要可复现的配置准备时，只有明确需要才依赖实时输入或时钟。

## 练习

加入启用的 `/metrics` 路由并更新静态测试。把端口配置改成 `"65536"`，确认解析选择回退值。用 `carven check` 单独执行准备，再用 `carven --tests` 执行普通运行时测试。静态检查失败使编译失败；断言、越界和执行预算耗尽不会变成可捕获失败。
