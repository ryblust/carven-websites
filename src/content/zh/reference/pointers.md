---
title: 指针与外部地址
description: 可空地址、addressof、目标权限、非空证明、存活检查和原生资源责任。
section: reference
lesson: 16
source: docs/semantics.md
---

## 地址值与目标访问

`ptr<T>` 保存授予 Read 的地址，`ptr<&T>` 保存授予 Write 的地址。两者可空、可复制、非拥有。`let`/`var` 控制地址槽位重赋值，目标权限由指针类型决定；不可变 `let p: ptr<&T>` 可以修改目标。

目标可以是 Carven 类型、C++ 类型或嵌套指针。指针不按值包含目标，允许递归结构。`ptr<void>` 可保存和传递，不能解引用。原生别名是否合法由 C++ 检查。

`*p` 选择目标位置，`p->field` 是 `(*p).field`。地址必须可用且在当前 callable 局部证明非空。`let x = *p` 是普通拥有值初始化；原生复制能力由 C++ 检查。`&*p` 可传 Write 目标，`&&*p` 非法，因为目标不是可 Take 的 Carven owner。

## 用 `addressof` 取地址

`addressof(place)` 为具有 Read 访问的可寻址位置产生 `ptr<T>`；`addressof(&place)` 产生 `ptr<&T>`，要求该位置允许 Write。位置可以是局部绑定、参数、字段或元素，只求值一次。结果在创建时非空，因此直接通过它解引用不需要另做检查。

```carven
fn bump(target: ptr<&i32>) {
    if target != nullptr {
        *target += 1;
    }
}

var count = 1;
let reader = addressof(count);
let writer = addressof(&count);
bump(writer);
*writer += 10;
println(*reader, count); // 12 12
```

| 操作数                                | 诊断                       |
| ------------------------------------- | -------------------------- |
| 临时值，例如 `addressof(1)`           | `CV-ACCESS-NOT-ASSIGNABLE` |
| 编译期常量名                          | `CV-ACCESS-NOT-ASSIGNABLE` |
| 对 `let` owner 写 `addressof(&value)` | `CV-ACCESS-IMMUTABLE`      |
| `addressof(&&value)`                  | `CV-ACCESS-CALL-MISMATCH`  |

`addressof` 是通过普通名字查找得到的内建 callable，局部声明可以遮蔽它。给存活的 owner 赋新值不改变其地址。Take 结束 owner 的身份，之后重新赋值也不会让旧指针恢复有效。从 Read 数组参数取得的地址可能指向调用者的存储；若调用者传入临时数组，该存储随所在完整表达式结束。

## 转换与传参

相同目标类型下，`ptr<&T>` 可以在值上下文中缩窄为 `ptr<T>`，包括初始化、赋值、字段/元素、Read 实参、`const` 和返回；反方向非法。没有数组、聚合、嵌套目标或函数类型的通用协变。内层指针复制保持内层权限。

Read 指针实参保存地址快照；Write 别名地址槽位，完整类型须一致；Take 也要求精确类型，转移地址值并使源 owner 不可用，不清空其他副本或释放目标。

`nullptr` 需要具体指针上下文，没有独立 null 类型。与 `nullptr` 或相同目标类型指针可做 `==/!=`。没有 truthiness、排序、算术、直接索引或整数转换；`addressof` 是 Carven 唯一的取地址操作。`&p` 是传递槽位 Write 访问，不自动生成 `T**`。

混合权限的无上下文数组或分支结果需要注解。相邻类型可帮助 `nullptr` 定型，但不能授权嵌套数组或分支的权限缩窄。

## 局部非空证明

```carven
fn read(pointer: ptr<i32>) -> i32 {
    if pointer == nullptr {
        return 0;
    }

    return *pointer;
}
```

每个函数和闭包独立跟踪 null、nonnull、unknown，覆盖局部名字、固定 Carven 字段路径和常量数组索引。`nullptr` 比较、否定、短路、提前 return 可细化分支，合流仅保留共有事实。`bool` helper、API 成功码或 check/require 不构成证明。

复制与权限缩窄把当前事实带给新槽位，不建立持续相等关系。赋值替换事实，Take 去掉源事实。Write 调用清除重叠事实。曾传给 Write 的槽位可能逃逸，后续调用会清除这些槽位、Write 参数和 Write 捕获的事实。循环进入条件和体前清除可能写入事实，不做跨迭代关系求解。

原生投影、动态索引、通过指针到达的内存没有跨表达式事实。先存为局部 handle，再检查。未证明解引用报 `CV-PTR-NONNULL`，不会自动插入运行时陷阱。向 API 传可空地址不需要解引用证明。刚产生的 `addressof` 结果视为非空。

## 原生责任与表示

Read/Write 目标分别对应 `const T*` 和 `T*`，按指针层组合。Read 按值传地址，Write 使用对应指针引用。生成代码在后续操作可能改槽位前选定解引用地址。

存储或传递指针通常只需目标声明，可使用不完整原生类型；形成原生目标的 C++ 类型表达式仍须满足其自身的完整性要求。指针内的纯 Carven callable 签名不对其参数类型施加该要求：`struct Node { callback: ptr<fn(Node) -> void> }` 是合法的，经生成的 C++ 接口导出时也是如此。

指针复制、传参和 Take 不做分配、引用计数或释放。非空不证明存活，见[存活检查](#存活检查)。资源 owner 和 C++ 适配器负责分配、释放、T** 输出协议、缓冲遍历和有效期。指针可通过声明式 import(cpp)/export(cpp) 契约传递；原生提供者与调用者仍负责目标生命周期。

## 存活检查

非空从不证明目标仍存活；普通运行时指针操作也不附加通用的借用或存活检查。外部地址沿用其提供者的生命周期契约。

必需的编译期执行更严格：求值器跨调用和作用域跟踪每个局部对象，解引用一个目标已离开作用域或已被 Take 的指针会报告 `CV-CONST-EVALUATION`，即使该存储之后又被赋值。文本 backing 已失效的字节地址同样如此。

```carven
const fn escaped() -> ptr<i32> {
    var value = 1;
    return addressof(value);
}

const test "dangling address" {
    let address = escaped();
    if address != nullptr {
        check(*address == 1);
    }
}
```

`carven check` 在 `*address` 处拒绝这个测试。编译期执行中，局部指针可以创建、经 Read 与 Write 参数传递，并在目标存活时解引用；但非空局部指针不能成为发布的常量值。
