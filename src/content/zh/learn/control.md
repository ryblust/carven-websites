---
title: "选择分支与重复执行"
description: 用条件、整数区间、模式匹配和循环更新组织执行。
section: learn
lesson: 2
source: docs/language/control-flow.md
---

## 条件产生一个值

```carven
let quantity = 3;
let label = if quantity > 0 { "in stock" } else { "empty" };
println(label);
```

输出 `in stock`。值形式 if 必须有 else，分支结果类型兼容。分支最后不带分号的表达式产生分支值；加分号后成为普通语句。

## 从范围计算总和

```carven
var total = 0;

for value in 1..5 {
    total += value;
}

println(total);
```

输出 `10`。`1..5` 包含 1、2、3、4，不含 5；起点和终点只求值一次。起点不小于终点时零次迭代。整数范围中的绑定只读，下一个值由循环提供。

`1..=4` 也产生 1、2、3、4：`..=` 包含上端点。`1..1` 为空，`1..=1` 则包含一个 1；起点大于终点时，两种区间都为空。

## 保存一个区间

```carven
var end = 4;
let values: range<i32> = 1..=end;
end = 8;

var total = 0;
for value in values {
    total += value;
}
println(values, total);
```

输出 `1..=4 10`。创建 values 时已经保存了 1 和 4；后来把 end 改成 8 不会改变它。`println` 按端点显示区间。`range<i32>` 表示整数区间的类型。区间可以像其他值一样保存，后续学到函数时也可以把它用作参数和返回值。

循环开始时还会保存源区间的快照，因此在循环体里重新赋值源区间，也不会改变正在遍历的序列。

## 让端点决定整数类型

```carven
let code = "A-17";
let positions = 0..code.len();
println(positions);

for index in positions {
    println(index);
}
```

先输出 `0..4`，再逐行输出 0 到 3。`code.len()` 返回 `usize` 字节数，因此字面量 0 也按 `usize` 检查，positions 的类型是 `range<usize>`，不需要 cast 或带后缀的 0。两个无后缀端点仍默认 `i32`；这里若显式注解 `range<i32>` 会被拒绝，因为两个端点无法统一到该类型。已有变量保持原类型：`i32` 变量和 `usize` 长度不能组成一个区间。

## 按区间选择结果

```carven
let score = 85;
let label = match score {
    ..0 => "invalid",
    0..60 => "retry",
    60..=100 => "pass",
    101.. => "invalid",
};
println(label);
```

输出 `pass`。从上往下读：小于 0 无效；0 到 59 需要重试；60 到 100 通过；大于 100 无效。这里 `..0` 和 `101..` 省略一侧边界；这种写法只用于模式，不能用来创建区间值。

match 按顺序选择匹配的分支，并检查是否覆盖所有输入。删除 `101..` 这一分支，会因缺少覆盖而报错。用 match 给一个值分类；用 if 根据一般条件决定动作。

### 等价的 C++20

```cpp
#include <iostream>
#include <string_view>

int main() {
    const int score = 85;
    const std::string_view label = [&]() -> std::string_view {
        if (score < 0) return "invalid";
        if (score < 60) return "retry";
        if (score <= 100) return "pass";
        return "invalid";
    }();
    std::cout << label << '\n';
}
```

这份手写 C++ 输出相同结果，条件也不复杂。Carven 在这里的价值是直接写出区间，并检查这些区间是否覆盖了整数输入。C++ 的 if 链不提供同样的区间覆盖检查。

端点也可以是运行时值；此时通常需要 `_` 兜底。端点何时求值，以及动态模式的覆盖边界，见[控制流参考](/zh/reference/control/)。

## while 与 C 风格 for

```carven
var index = 0;

while index < 3 {
    println(index);
    ++index;
}

for var i = 0; i < 3; ++i {
    if i == 1 {
        continue;
    }
    println(i);
}
```

依次输出 0、1、2、0、2，各一行。C 风格 for 的 continue 会先执行步进再判断条件；break 直接退出循环。while 每次执行体前检查条件。无条件循环写成 `while { ... }`，用 `break` 退出；C 风格 for 必须提供条件。

## 只执行选中的路径

`&&` 左侧为 false 时不执行右侧；`||` 左侧为 true 时不执行右侧。只有所选分支运行，但所有源分支都接受语义检查。把错误代码写在 `if false` 里不使它合法。字面量与 `const` 条件不会裁剪分析：普通 `if false`、`while true` 与短路操作数仍为所有权、失败与返回检查贡献可能路径。只有无条件的 `while { ... }` 没有隐式退出路径。静态控制明确选择生成工作，同时检查所有源码分支。

像上面的循环一样，用语句形式的 if 组织 break 或 continue。值分支还有额外的控制转移规则，详见[控制流参考](/zh/reference/control/)。

终止当前路径的 `return`、失败或循环转移之后，源码仍要检查类型，但不贡献运行时工作或可达的所有权与失败路径。

## 练习

把求和示例的区间分别改成 `1..1` 和 `1..=1`，比较 0 与 1。再用 `1..6` 跳过 3，结果应为 12，并用 while 写出相同结果。把分类示例中的 score 改为 -1、59、60、100 和 101，检查每个边界。最后把端点示例中的文本改成 `"order-1024"`，先预测输出的区间。
