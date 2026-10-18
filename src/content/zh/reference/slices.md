---
title: "切片与静态存储"
description: 只读切片的构造、借用、子范围、返回以及常量冻结。
section: reference
lesson: 11
source: docs/language/types.md
---

## `[T]` 的含义

切片 [T] 用来读取一段连续元素，不复制内容，也不把长度写进类型。数组或 Vector 仍拥有这些元素，使用切片期间必须让它保持存活。复制切片只复制视图，仍引用同一份存储。元素表示保持不变：`[A]` 不会逐元素转换成 `[B]`。

下例中的 `first` 要求至少有一个元素。

```carven run
fn first(values: [i32]) -> i32 => values[0];

fn main() {
    let values = [2, 4, 6];
    let view = values.slice();
    println(first(values), view.length());
}
```

`array.slice()` 与 `vector.slice()` 显式创建视图，也可以直接调用 `slice(start, end)` 选择子范围。目标需要 `[T]` 时，`[T; N]` 与 `Vector<T>` 可在初始化、赋值、实参、返回和聚合元素位置隐式创建同样的视图。数组字面量使用期望切片的元素类型，`[]` 也适用。由零长度数组形成的空切片不保留底层存储。没有切片上下文时数组仍是数组。Write 实参需要已有的切片变量或其他可写存储位置。

## 操作

| 操作                  | 结果                             |
| --------------------- | -------------------------------- |
| `s.length()`          | `usize` 元素数                   |
| `s.is_empty()`        | `bool`                           |
| `s[index]`            | Read 元素访问，索引为整数        |
| `s.slice()`           | 保留相同范围与底层存储的视图副本 |
| `s.slice(start, end)` | 半开范围，两个参数为 `usize`     |
| `for item in s`       | Read 迭代                        |

`slice(length, length)` 等空范围有效。非法动态索引或范围终止。切片没有元素写入、Write 迭代、指针提取或相等比较。读取元素仍应用该元素类型的 Read/值规则。

## 借用持续时间

已知 Carven 底层存储的切片保护整个源数组或 Vector，阻止修改、替换、Take 和销毁，不按不相交子范围细分。切片复制、参数、返回、字段、闭包和失败载荷保留底层存储关系。取出一个本身包含视图的元素，也保留其内部借用。

保存切片不会延长源数组的生命周期。不能返回指向函数局部数组的运行时切片。临时底层存储遵循完整表达式和循环源保留规则。最后一次读取不是命名视图借用的自动结束点。

## 冻结常量切片

常量初始化器可将完成的数组或 Vector 保留为切片：

```carven
const table: [i32] = [2, 4, 6];
const middle = table.slice(1, 3);
const count = middle.length();

fn table_view() -> [i32] => table;
```

这里元素存储具有静态生命周期，可复制、保存和返回。这不意味着常量声明在源语言中具有固定地址；原生代码不能依赖不同使用点或产物共享同一地址。

元素类型的保留和可支持的常量结果遵循[冻结规则](/zh/reference/constants/#常量结果与底层存储)。保留数组和构造常量子切片计入共享的[执行预算](/zh/reference/constants/#执行预算)。

## 编译期执行中的切片

在必需的编译期执行中，切片参数、局部切片、`length`、`is_empty`、索引、子切片和循环都基于存活的底层存储执行。复制和链式切片保留底层存储关系但不延长其生命周期；索引和子区间在执行时检查边界，越界报告 `CV-CONST-INDEX-BOUNDS`。常量求值完成时，会先冻结选中的元素，再释放底层存储，因此 `const fn` 可以返回冻结常量切片的视图：

```carven run
const fn total(values: [i32]) -> i32 {
    var sum = 0;
    for value in values {
        sum += value;
    }
    return sum;
}

const fn tail(values: [i32]) -> [i32] => values.slice(1, values.length());

const table: [i32] = [2, 4, 6];
const rest = tail(table);
const sum = total(rest);
println(rest.length(), sum); // 2 10
```

普通生命周期规则仍然适用：返回 `const fn` 局部数组的切片会被拒绝。`const fn` 的数组返回值也可以在常量初始化完成时成为冻结切片。仅仅知道一个运行时数组的内容，不会赋予它静态底层存储。
