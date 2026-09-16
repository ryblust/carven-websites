---
title: "使用原生地址与检查非空"
description: 保存原生地址，建立局部非空证明，并保持资源所有者存活。
section: learn
lesson: 14
source: docs/semantics.md
---

## 地址来自原生边界

Carven 没有通用取地址运算符。用原生适配器获得地址，再用 ptr 保存：

```carven
import <cstdint>;

#[cpp] ---
std::int32_t* counter_address() noexcept {
    static std::int32_t value = 7;
    return &value;
}
---

fn main() {
    let pointer: ptr<&i32> = ::counter_address();

    if pointer != nullptr {
        *pointer += 1;
        println(*pointer);
    }
}
```

这个独立程序输出 8。指针目标是原生静态对象，在程序运行期间保持存活。`ptr<&i32>` 允许写目标；pointer 本身是 let，不能重新绑定，但不撤销目标 Write 权限。

## 非空证明是局部的

解引用之前必须直接建立当前函数中的非空事实。直接 nullptr 比较和提前 return 可以证明；返回 bool 的辅助函数、原生 API 的成功码或 require 不提供相同证明。每个闭包也要独立证明。

Write 调用可能改地址槽位，会清除相关事实。通过动态索引或原生成员取得指针时，先保存为局部指针变量，再检查这个变量，确保非空检查与解引用使用同一次求值的结果。

## 不拥有目标

复制 ptr 复制地址，Take ptr 使源地址 owner 不可用，都不释放目标。多个副本不会自动变 null。非空只说明地址条件，不说明目标存活。

目标资源的生命周期需要由外部资源管理约定保证。不要返回指向原生局部对象的地址，也不要在原生释放后继续解引用。ptr<void> 可保存和传递，但不能解引用；指针不支持算术、直接索引、隐式布尔转换或整数转换。

## 练习

将目标类型改成 ptr<i32>，保留读取但删除写入。尝试保留写入应得到访问错误。再删除 nullptr 判断，确认编译器要求局部非空证明。
