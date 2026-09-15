---
title: 常量、const fn 与执行预算
description: 常量事实、模块常量、编译期函数、文本冻结及资源限制。
section: reference
lesson: 13
source: docs/semantics.md
---

## 常量声明

模块 const 定义一个具名、定型的编译期值。private 与裸声明可推断类型；export const 必须显式注解类型，字面量后缀不能替代该注解。模块级 `const _` 非法。

```carven
private const radix = 10;
const retries: i32 = 3;
export const protocol: u32 = 1;
```

按依赖完成初始化，允许前向引用，必需事实成环产生 `CV-CONST-CYCLE`。每次使用同一归一化值。常量只有 Read，不产生运行时绑定、源地址或链接身份。冻结切片可以有静态 backing，但声明本身仍没有地址身份。

局部 const 是编译期词法名字，lambda 可直接使用，不需要捕获。

## 常量表达式的范围

支持字面量、数值枚举 case、已完成常量、括号、允许的 cast、纯一元和二元操作、常量文本查询、全常量载荷构造、支持的插值和 String 操作、常量参数的直接 const fn 调用。固定数组、结构体、索引、字段和逐成员相等可在允许的聚合子集中产生常量。常量初始化器也可创建和查询冻结切片。

普通函数调用和直接控制流表达式不是常量表达式。需要分支或循环时放入 const fn。知道运行时结果并不让表达式成为常量；例如带普通调用的 `(source() == 1) && false` 仍不符合常量表达式要求。

整数常量算术检查溢出、除零与移位范围。整数 cast 按目标宽度模转换。浮点字面量、支持的 cast 和相等可以形成常量事实；普通浮点算术和排序不可以。`const x = 1.0 + 2.0;` 非法。

## const fn

const fn 是可以被必需常量上下文执行的命名函数。仅声明它不会执行；普通运行时调用仍是运行时调用，即使参数都是字面量。入口和 import(cpp) 不能是 const fn。

```carven
const fn label(count: i32) -> String {
    var result = String::new();

    for index in 0..count {
        result.append_format(f"{index:02}");
    }

    return result;
}

const name = label(3); // str: 000102
```

参数使用 Read 或 Take，类型支持整数、bool、char、str、String 和允许的固定数组/结构体。结果支持这些类型或 void，void 不能初始化常量。结果推断沿用普通函数规则。

允许局部初始化、赋值、Take、标量运算、if/match/while、C 风格 for、整数范围和数组范围、return/break/continue、直接 const fn 调用和可完成依赖的递归。match 支持内建主体、字面量/绑定/通配/或模式以及 guard。

允许 String 构造、复制、as_str、len/is_empty、append/append_format、push/clear、支持子集的插值，以及打印。插值支持整数、bool、char、文本的默认格式，以及整数 `b/B/o/d/x/X` 表示、十进制宽度和可选零填充。支持的动态宽度表达式先求值；其他格式即使能在运行时使用，也不能在必需常量执行中使用。数组支持构造、索引、元素赋值、相等、复制、Read/Write 迭代、整绑定 Take 和参数/结果。结构体支持构造、字段访问/赋值、相等、复制、整绑定 Take 和参数/结果。

聚合内部只支持整数、bool、char、str 和递归数组/结构体；不把 String 字段或元素冻结成 str。空数组须有元素上下文。保持名义身份、长度和每个成员类型。

Read 数组及含数组结构体在所有实参求值后观察内容；标量与不含数组的支持结构体在实参位置保存值。Read String 也在所有实参或孔完成后读内容。字段和索引投影按选中值的类型规则处理。

## 准入与冻结

所有定义都检查，包括未调用函数和不活动分支。const fn 不支持原生操作、Write 参数/实参、typed failure、throw/try/`?`、浮点、枚举、指针、切片、callable、间接调用、文本 bytes/chars 迭代和 unchecked 文本构造。局部可变存储与数组 Write 迭代仍可用。

String 在计算中保持拥有与 Take 语义。只有整个常量初始化完成时，拥有文本结果才冻结为 str；`const name: String = label(3);` 非法。数组结果可在此边界变成冻结切片；const fn 内部不能操作切片。

## 编译期与运行时的算术

必需常量执行检查整数溢出、除零和非法移位。普通运行时调用同一个 const fn 时，整数算术仍遵循运行时规则，包括加、减、乘的模回绕。函数的 const 修饰不把所有调用都改成受检算术。

短路与控制流决定实际执行哪些操作；定义准入仍检查所有分支。未执行的除零不会触发求值错误，不支持的原生调用则不能靠不活动分支隐藏。

## 执行预算

| 限制                      | 当前值  |
| ------------------------- | ------- |
| 每个调用树执行步数        | 100,000 |
| 嵌套调用深度              | 128     |
| 单个文本值                | 1 MiB   |
| 累计文本构造、复制和输出  | 8 MiB   |
| 单聚合全部嵌套字段/元素槽 | 65,536  |
| 聚合嵌套层数              | 64      |
| 累计槽位构造和复制        | 524,288 |

追加计新增字节，查询不复制接收者。预算衡量工作量，不是存活内存。直接聚合初始化同样受大小、层数和工作预算约束，格式说明另有嵌套限制。

定义准入错误为 `CV-CONST-ADMISSION`，执行错误为 `CV-CONST-EVALUATION`，预算超限为 `CV-CONST-LIMIT`；类型、算术和依赖诊断仍适用。失败不回退运行时。
