---
title: "控制流与模式"
description: if、while、for、match、break、continue、return 的语法、执行与限制。
section: reference
lesson: 6
source: docs/language/control-flow.md
---

## 控制流总览

控制语句选择分支、重复执行或结束当前流程。`if`、`match`、`try` 还可用作产生值的表达式；`while`、`for` 是循环语句。条件必须是 `bool`，控制体使用花括号。

| 形式                                        | 用途                                       |
| ------------------------------------------- | ------------------------------------------ |
| `if condition { ... } else { ... }`         | 按条件选择分支                             |
| `while condition { ... }`                   | 条件为真时重复执行                         |
| `while { ... }`                             | 重复执行，直到控制转移离开循环             |
| `for value in source { ... }`               | 遍历整数区间、数组、Vector、切片或字符视图 |
| `for initializer; condition; steps { ... }` | 带初始化和步进的循环                       |
| `match value { ... }`                       | 按模式选择分支                             |
| `break;` / `continue;`                      | 退出最近的循环 / 进入下一次迭代            |
| `return value;`                             | 从当前函数或 lambda 返回                   |

[`try` / `catch` 与失败传播](/zh/reference/failures/)有独立章节；[`const if` / `const for`](/zh/reference/functions/#静态控制)用于静态特化。

## if

语句形式可以省略 `else`。按顺序检查条件，执行第一个为真的分支；都不满足时执行 `else`（如果存在）。没有数值或指针到 `bool` 的隐式转换。

```carven run
let score = 75;
if score >= 90 {
    println("excellent");
} else if score >= 60 {
    println("pass");
} else {
    println("retry");
}
```

输出 `pass`。值形式必须有 `else`。产生非 `void` 结果时，每个正常完成的分支必须以末尾表达式产生兼容结果，结果表达式后不写分号。没有末尾表达式的分支块产生 `()`，即 `void` 值。

```carven run
let score = 75;
let status = if score >= 60 { "pass" } else { "retry" };
println(status); // pass
```

值形式 `if`、`match`、`try` 的分支沿用外围期望类型，可产生[上下文构造](/zh/reference/aggregates/#上下文构造)。语句形式不产生值。值分支中不能向外层函数或循环进行控制转移，见[值分支的控制边界](#值分支的控制边界)。

```carven
let result = if true { 1 }; // 编译错误：值形式缺少 else。
```

## while

`while condition { ... }` 在每次迭代之前检查条件。条件为 `false` 时结束，可以一次也不执行。`while { ... }` 不检查条件，适用于明确在循环体内退出的流程。

```carven run
var count = 0;
while count < 3 {
    println(count);
    ++count;
}
```

依次输出 0、1、2。无条件循环的例子：

```carven run
var count = 0;
while {
    if count == 3 {
        break;
    }
    ++count;
}
println(count); // 3
```

语义分析只把无条件 `while { ... }` 视为不会自行结束。`while true { ... }` 仍保留条件退出的分析路径。

## for

### 遍历形式

`for name in source { ... }` 遍历整数区间、数组、Vector、只读切片或文本字符视图。绑定可以带类型注解；可写数组与 Vector 允许 `for &name in source` 修改元素。

```carven run
var values = [1, 2, 3];
for &value in values {
    value *= 2;
}
for index in 0..values.length() {
    println(values[index]);
}
```

依次输出 2、4、6。这里 `0` 从右侧的长度取得 `usize` 类型，无需额外后缀。`0..3` 不包含 3，`0..=3` 包含 3。反向区间为空；端点相等时，半开区间为空，闭区间产生一个值。闭区间可以包含整数类型的最大值，不会在最后一步溢出。

整数区间循环在开始时保存区间快照；之后修改源区间或原始端点，不改变本次遍历。整数区间绑定不能 Write；切片和字符视图只允许 Read。循环绑定不能 Take；绑定的名字在自己的类型注解和遍历源表达式中尚不可见。

数组和 Vector 迭代在退出前保留对源所有者的访问，不能在遍历期间 Take 整个所有者。Vector 遍历还禁止 `push`、`remove`、`clear` 等结构修改；Write 遍历可以更新已有元素。写某个元素不会恢复不可用的完整数组。循环在确认游标有效后才访问元素，结束检查不读取越界元素。

### C 风格形式

```text
for initializer; condition; step1, step2 {
    statements
}
```

不使用围绕头部的圆括号。初始化器和步进可以省略，条件必需且为 `bool`。循环建立自己的作用域：初始化一次，每次检查条件，再执行循环体，最后按书写顺序执行步进。

```carven run
var total = 0;
for var index = 0; index < 4; ++index {
    total += index;
}
println(total); // 6
```

步进允许赋值、前缀自增减与普通表达式，可以用逗号分隔多项。`continue` 先执行步进，再检查条件；`break` 直接退出。

## break

`break;` 退出最近的外围循环，不携带返回值。循环后的语句继续执行；没有循环目标时非法。

```carven run
for value in 0..10 {
    if value == 3 {
        break;
    }
    println(value);
}
```

依次输出 0、1、2。

## continue

`continue;` 跳过当前循环体的剩余部分，开始下一次迭代。`while` 回到条件检查，遍历循环推进游标，C 风格 `for` 先执行步进。

```carven run
for value in 0..5 {
    if value % 2 == 0 {
        continue;
    }
    println(value);
}
```

依次输出 1、3。`break` 和 `continue` 不能跳转到命名标签。

## return

`return expression;` 从当前函数或 lambda 返回成功结果；`return;` 只适用于成功结果为 `void` 的函数。函数块体不会隐式返回最后一个表达式。只返回一个表达式的函数通常写成表达式体：

```carven run
fn describe(value: i32) -> str => if value == 0 { "zero" } else { "nonzero" };

println(describe(3)); // nonzero
```

返回具名所有者默认复制；需要转移时明确写 `return &&owner;`。结果推断、所有路径返回和失败处理规则见[函数](/zh/reference/functions/)，转移规则见[所有权](/zh/reference/ownership/)。

## match 与模式

语句 match 和值 match 都必须穷尽；值 match 另要求结果兼容。被匹配的表达式只求值一次。结果为临时值时，即使某个守卫条件不通过，也会保留该值以继续匹配。匹配已有存储时，接收者和索引只求值一次，选中的存储在匹配期间保持稳定。

```carven
enum Reply {
    Empty,
    Number(i32),
}

fn unpack(reply: Reply) -> i32 => match reply {
    .Empty => 0,
    .Number(value) if value > 0 => value,
    .Number(_) => -1,
};
```

按源码顺序选择第一个模式匹配且守卫条件通过的分支。守卫条件可修改其他存储、调用函数、产生失败；不能通过直接访问、别名或捕获取得与主体重叠存储的 Write/Take。选中的分支体可以修改被匹配的值。

模式支持递归元组与枚举 case、整数区间、字面量、绑定、`_`、`is T` 和 `|`，不支持结构体或数组解构。载荷数量必须精确匹配。裸标识符为选中的值建立 Read 绑定，不表示与同名常量相等。纯 Carven 值保存快照，具有内部存储的值（包括原生对象）则借用原存储。`&name` 建立 Write 绑定，要求主体可写且可被跟踪。整个模式匹配成功后才建立绑定，随后执行守卫条件；绑定不能作为 Take 来源。借用绑定会保持外围存储稳定，借用期间不能替换或 Take 该存储。

`is T` 要求被匹配的值已经具有兼容的规范类型，在此约束下覆盖该类型。或模式各分支必须绑定名字、类型和访问模式都相同的绑定，一条分支不能重复绑定。守卫条件使用已建立绑定，但不贡献普通 match 的穷尽性覆盖。

同一或模式中，重复或已被其他备选模式完全覆盖的模式是错误。某个分支被前面没有守卫条件的分支完整覆盖时，会产生不可达警告 `CV-FLOW-UNREACHABLE-MATCH-ARM`，仍接受语义检查但不参与运行时选择。诊断会给出最短的未覆盖示例，并保证相同输入下选择一致。

`match &&owner` 将完整主体转入 match 保留的存储。模式绑定仍采用 Read 或 Write 访问；守卫条件不通过时，不会转移单独的载荷。需要在分支内取得独立所有者时，先写 `let owned = payload;` 复制选中的载荷，再用 `&&owned` 转移该所有者。

字面量模式按语言归一化后的相等规则判断。`0.0` 与 `-0.0` 是同一个浮点模式，不能将它们作为两个不同的备选模式。

## 元组模式与 Write 绑定

元组模式按精确元素数量与嵌套层次递归匹配。`()` 匹配单元值，`(pattern)` 表示分组，`(pattern,)` 匹配单元素元组。元组位置和枚举载荷支持 case、字面量、绑定、通配、整数区间、`is` 和或模式。元素测试和动态端点按从左到右的顺序执行，前项不匹配时跳过后项。`(true, _) | (_, true)` 仍遗漏 `(false, false)`。

```carven run
var records = [("alpha", 2), ("beta", 3)];
for &(name, count) in records {
    count *= 2;
    println(name, count);
}

var pair = (true, 3);
match pair {
    (true, &count) => { count *= 2; },
    (false, _) => {},
}
println(pair.1); // 6
```

循环目标中的绑定通过 Write 访问当前元组的对应元素，元组本身并不因此可遍历。match 中的 `&count` 修改 `pair` 的对应字段，第一个布尔字段决定执行哪个分支。守卫条件和借用绑定遵循 [match 与模式](#match-与模式)中的规则。

## 整数区间模式

整数主体和枚举中的整数载荷支持 `a..b`、`a..=b`、`..b`、`..=b`、`a..`。省略的一侧延伸到主体整数类型的对应边界；已有端点使用主体的整数类型。空区间与反向区间永不匹配。

```carven
fn inside(value: i32, low: i32, high: i32) -> bool => match value {
    low..=high => true,
    _ => false,
};
```

这里 low 和 high 是运行时端点，因此用 `_` 覆盖其余情况。只有直接已知且无需执行的端点参与静态覆盖证明；动态端点不能证明穷尽性。即使结果已知，带有副作用的端点也必须保留求值。

尝试一个模式时，才从左向右各计算一次端点，然后检查包含关系。枚举 case 不匹配、前面的载荷不匹配，或或模式中的前一个备选模式已成功，都会跳过后续端点。端点产生失败时向外传播，而非简单地尝试下一个分支。端点不能取得主体的 Write/Take 权限，也不能引用同一模式刚引入的绑定。catch 载荷也支持递归区间模式。

例如 `..0`、`0..=100`、`101..` 覆盖所有 `i32` 值，无需通配分支。移除最后一个区间后，match 不再穷尽；守卫条件不能补足这个缺口。

## 值分支的控制边界

return 作用于当前函数或 lambda，break/continue 作用于循环。值形式 if/match/try 的结果分支不能 return 到外围函数，也不能 break/continue 到外围循环；分支内部新建循环可接收自己的转移。常量块具有同样的边界。违规产生 `CV-FLOW-TRANSFER-BOUNDARY`。

## 顺序与不活动代码

表达式遵循[求值次序规则](/zh/reference/operators/#短路与求值次序)。失败会跳过当前路径的后续求值。

所有源码操作数和分支都接受操作合法性、结果兼容性与失败处理检查，包括终止语句之后的源码。终止语句之后的源码不参与运行时求值，也不计入向外传播的失败、所有权转移或可达使用情况。不会正常返回的表达式可以出现在类型已知的位置；调用仍须确定可调用值类型，match 仍须确定主体类型。

普通条件不跳过源码检查。结构可达性、失败契约与返回分析仍考察 if、逻辑运算、match 和带条件循环的所有结构分支，即使条件是字面量或常量。所有权可用性与指针证明则先计入条件的副作用，再用已证明的布尔结果选择可能正常继续的路径；未知条件合并两侧。只有无条件的 `while { ... }` 才被视为不会自行结束，只能通过 `break` 退出。[静态控制](/zh/reference/functions/#静态控制)显式选择特化与生成，但各源码分支仍接受检查。
