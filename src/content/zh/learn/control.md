---
title: "选择分支与重复执行"
description: 用条件、整数区间、模式匹配和循环更新组织执行。
section: learn
lesson: 3
source: docs/language/control-flow.md
---

## 条件产生一个值

根据数量选择库存标签，再打印标签。用 if 表达式产生选中的文本：

```carven run
let quantity = 3;
let label = if quantity > 0 { "in stock" } else { "empty" };
println(label);
```

输出 `in stock`。用于产生值的 if 必须有 else，且各分支的结果类型必须兼容。分支最后不带分号的表达式产生分支值；加分号后成为普通语句。

## 把局部名字留在分支中

在分支内计算临时价格，离开分支后再读取原价格。把这个独立程序保存为 main.cv：

```carven run
let price = 12;

if price < 20 {
    let price = price + 3;
    println(price);
}

println(price);
```

运行 `carven main.cv`，逐行输出 `15` 和 `12`。内层 price 是新绑定，初始化式读取外层 price。分支结束后，外层绑定重新可见。

## 从范围计算总和

```carven run
var total = 0;

for value in 1..5 {
    total += value;
}

println(total);
```

输出 `10`。`1..5` 包含 1、2、3、4，不含 5；起点和终点只求值一次。起点不小于终点时，不执行循环体。遍历整数区间时，循环变量只读，下一个值由循环提供。

`1..=4` 也产生 1、2、3、4：`..=` 包含上端点。`1..1` 为空，`1..=1` 则包含一个 1；起点大于终点时，两种区间都为空。

## 保存一个区间

```carven run
var end = 4;
let values: Range<i32> = 1..=end;
end = 8;

var total = 0;
for value in values {
    total += value;
}
println(values, total);
```

输出 `1..=4 10`。创建 values 时已经保存了 1 和 4；后来把 end 改成 8 不会改变它。`println` 按端点显示区间。`Range<i32>` 表示整数区间的类型。区间可以像其他值一样保存，后续学到函数时也可以把它用作参数和返回值。

循环开始时还会保存源区间的快照，因此在循环体里重新赋值源区间，也不会改变正在遍历的序列。

## 让端点决定整数类型

```carven run
let code = "A-17";
let positions = 0..code.byte_length();
println(positions);

for index in positions {
    println(index);
}
```

先输出 `0..4`，再逐行输出 0 到 3。`code.byte_length()` 返回 usize 字节数。usize 是用于长度和索引的无符号整数类型。字面量 0 由此得到相同类型，因此 positions 是 `Range<usize>`。组合不同整数类型的端点时，查阅[类型参考](/zh/reference/types/)中的期望类型规则。

## 按区间选择结果

```carven run
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

端点也可以是运行时值；此时通常需要 `_` 兜底。端点何时求值，以及含运行时端点的模式如何检查覆盖，见[控制流参考](/zh/reference/control/)。

## while 与 C 风格 for

先用 while 逐个打印索引，再用 C 风格 for 重复这个过程，但跳过索引 1：

```carven run
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

依次输出 0、1、2、0、2，各一行。`++` 把变量加一。`continue` 跳过循环体中的剩余语句；在 C 风格 for 中，它还会先执行循环更新语句，再判断条件。while 每次执行循环体前检查条件。C 风格 for 必须提供条件。

由循环体决定何时停止时，使用无条件 while。把这个独立程序保存为 main.cv，查找平方不小于 20 的最小正整数：

```carven run
var candidate = 1;

while {
    if candidate * candidate >= 20 {
        break;
    }
    ++candidate;
}

println(candidate);
```

运行 `carven main.cv`，输出 `5`。`break` 立即退出循环，candidate 保留通过检查时的值。

## 只执行选中的路径

`&&` 和 `||` 可以跳过不需要的工作：`&&` 左侧为 false 时停止，`||` 左侧为 true 时停止。同样，if 或 match 只执行选中的分支。

输入数量可能为零时，先判断再做除法。把这个独立程序保存为 main.cv，运行 `carven main.cv`：

```carven run
let count = 0;
let enough = count != 0 && 100 / count >= 10;
let empty_or_enough = count == 0 || 100 / count >= 10;

println(enough, empty_or_enough);
```

输出 `false true`。两个条件都跳过除法：第一个在 false 处停止，第二个在 true 处停止。把 count 改成 4，两者都会执行除法，输出 `true true`。

每个分支都必须包含合法代码，即使写在 `if false` 里面。[编译期章节](/zh/learn/constants/)会介绍在生成程序时作选择的 const if。

## 练习

把求和示例的区间分别改成 `1..1` 和 `1..=1`，比较 0 与 1。再用 `1..6` 跳过 3，结果应为 12，并用 while 写出相同结果。把分类示例中的 score 改为 -1、59、60、100 和 101，检查每个边界。最后把端点示例中的文本改成 `"order-1024"`，先预测输出的区间。
