---
title: 切片与静态 backing
description: 只读切片的构造、借用、子范围、返回以及常量冻结。
section: reference
lesson: 5
source: docs/semantics.md
---

## `[T]` 的含义

切片是可复制、非拥有、只读的连续元素视图。它保存对 backing 的关系，不复制元素。元素表示保持不变：`[A]` 不会逐元素转换成 `[B]`。

```carven
fn first(values: [i32]) -> i32 => values[0];

fn main() {
    let values = [2, 4, 6];
    let view = values.as_slice();
    println(first(values), view.len());
}
```

`array.as_slice()` 显式创建视图。目标需要 `[T]` 时，`[T; N]` 可在初始化、赋值、实参、返回和聚合元素位置隐式创建同样的视图。没有切片上下文时数组仍是数组。Write 实参需要实际切片槽位。

## 操作

| 操作                  | 结果                       |
| --------------------- | -------------------------- |
| `s.len()`             | usize 元素数               |
| `s.is_empty()`        | bool                       |
| `s[index]`            | Read 元素访问，索引为整数  |
| `s.slice(start, end)` | 半开范围，两个参数为 usize |
| `for item in s`       | Read 迭代                  |

`slice(len, len)` 等空范围有效。非法动态索引或范围终止。切片没有元素写入、Write 迭代、指针提取或相等比较。读取元素仍应用该元素类型的 Read/值规则。

## 借用持续时间

已知 Carven backing 的切片保护整个源数组，阻止修改、替换、Take 和销毁，不按不相交子范围细分。切片复制、参数、返回、字段、闭包和失败载荷保留 backing 关系。取出一个本身包含视图的元素，也保留其内部借用。

保存切片不会延长源数组寿命。不能返回指向函数局部数组的运行时切片。临时 backing 遵循完整表达式和保留循环源的规则。最后一次读取不是命名视图借用的自动结束点。

## 冻结常量切片

常量初始化器可将完成的数组保留为切片：

```carven
const table: [i32] = [2, 4, 6];
const middle = table.slice(1, 3);
const count = middle.len();

fn table_view() -> [i32] => table;
```

这里元素存储具有静态生命周期，可复制、保存和返回。常量声明不因此获得源级地址身份；原生代码不能依赖不同使用点或产物共享同一地址。

元素支持整数、bool、char、str，以及递归符合要求的固定数组和结构体。保持名义类型、字段类型、嵌套数组长度；不递归把内部数组转为切片或把 String 字段转成 str。空切片保留元素类型，常量索引和子范围在求值时检查。

`const fn` 的数组返回值可以在常量初始化完成时成为冻结切片。`const fn` 内仍不支持切片参数、局部切片和切片操作。仅仅知道一个运行时数组的内容，不会赋予它静态 backing。

保留数组和构造常量子切片按元素引用数量计入初始化器的 524,288 个元素工作预算；原数组仍满足每值大小和嵌套限制。
