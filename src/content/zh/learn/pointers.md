---
title: "使用原生地址与检查非空"
description: 用 addressof 取地址，保存原生地址，建立局部非空证明，并保持资源所有者存活。
section: learn
lesson: 14
source: docs/language/pointers.md
---

## 取一个位置的地址

`addressof(place)` 得到只读的 `ptr<T>`；`addressof(&place)` 得到可写的 `ptr<&T>`。保存为 `address.cv`：

```carven
fn restock(target: ptr<&i32>, amount: i32) {
    if target != nullptr {
        *target += amount;
    }
}

fn level(source: ptr<i32>) -> i32 {
    if source == nullptr {
        return 0;
    }
    return *source;
}

var stock = 7;
restock(addressof(&stock), 2);
println(stock, level(addressof(stock)));
```

运行 `./xmakew run carven address.cv`，输出 `9 9`。`addressof(&stock)` 里的 `&` 和 Write 实参一样请求写访问，所以 stock 必须是 `var`；改成 `let stock` 会报告 `CV-ACCESS-IMMUTABLE`。取地址的对象必须是命名绑定、字段或元素这样的位置：`addressof(1 + 2)` 这类临时值会被拒绝，也没有 `addressof(&&stock)`。

刚取得的地址非空，所以在创建处写 `*addressof(stock)` 不需要检查。两个辅助函数接收的是普通指针参数，调用者可能传入 `nullptr`，因此它们在解引用前各自检查。

## 地址来自原生边界

原生对象的地址由原生代码提供。用原生适配器获得地址，再用 ptr 保存：

```carven
import <cstdint>;

#[cpp] ---
std::int32_t* counter_address() noexcept {
    static std::int32_t value = 7;
    return &value;
}
---

let pointer: ptr<&i32> = ::counter_address();

if pointer != nullptr {
    *pointer += 1;
    println(*pointer);
}
```

这个独立程序输出 8。指针目标是原生静态对象，在程序运行期间保持存活。`ptr<&i32>` 允许写目标；pointer 本身是 `let`，不能重新绑定，但不撤销目标 Write 权限。

## 非空证明是局部的

解引用之前必须直接建立当前函数中的非空事实。直接 `nullptr` 比较和提前 return 可以证明；返回 `bool` 的辅助函数、原生 API 的成功码或 require 不提供相同证明。每个闭包也要独立证明。缺少证明的解引用会报告 `CV-PTR-NONNULL`。

Write 调用可能改地址槽位，会清除相关事实。通过动态索引或原生成员取得指针时，先保存为局部指针变量，再检查这个变量，确保非空检查与解引用使用同一次求值的结果。

## 不拥有目标

复制 ptr 复制地址，Take ptr 使源地址 owner 不可用，都不释放目标。多个副本不会自动变 null。非空只说明地址条件，不说明目标存活。

addressof 同样不延长目标的生命周期。函数返回 `addressof(local)` 不会被 Carven 拒绝，但函数返回后这个地址就悬空了。Take 之后不要再使用该 owner 之前的地址，即使它后来又被赋值。原生目标的生命周期需要由外部资源管理约定保证，不要在原生释放后继续解引用。ptr<void> 可保存和传递，但不能解引用；指针不支持算术、直接索引、隐式布尔转换或整数转换。完整规则见[指针参考](/zh/reference/pointers/)。

## 练习

在 address.cv 中删除 level 里的 `nullptr` 判断，应得到 `CV-PTR-NONNULL`。把 `var stock` 改成 `let stock`，`addressof(&stock)` 处应报告 `CV-ACCESS-IMMUTABLE`。在原生程序中把目标类型改成 ptr<`i32`>：读取仍可用，写入会得到访问错误。
