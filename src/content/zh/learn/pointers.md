---
title: "使用原生地址与检查非空"
description: "取得地址，在使用前检查它，并让所指数据继续存活。"
section: learn
lesson: 16
source: docs/language/pointers.md
---

## 取一个位置的地址

原生 API 有时使用已有对象的地址，而不是一个值副本。指针存放的就是这个地址。使用之前，要弄清它是否为空、是否允许写入，以及谁负责让对象继续存活。

`addressof(place)` 得到只读的 `ptr<T>`；`addressof(&place)` 得到可写的 `ptr<&T>`。把指针与 `nullptr` 比较来检查是否为空，`*pointer` 访问它所指的对象。保存为 `address.cv`：

```carven run
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
restock(nullptr, 2);
println(stock, level(addressof(stock)), level(nullptr));
```

运行 `./xmakew run carven address.cv`，输出 `9 9 0`。空地址的 restock 不修改存储，level 对空地址返回零。`addressof(&stock)` 里的 `&` 和 Write 实参一样请求写访问，所以 stock 必须是 `var`；改成 `let stock` 会报告 `CV-ACCESS-IMMUTABLE`。取地址的对象必须是命名绑定、字段或元素这样的位置：`addressof(1 + 2)` 这类临时值会被拒绝，也没有 `addressof(&&stock)`。

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

解引用之前，在当前函数中通过直接比较 `nullptr` 或提前 return 建立非空事实。缺少这项事实时，解引用会报告 `CV-PTR-NONNULL`。支持的检查方式及其跨分支规则见[指针参考](/zh/reference/pointers/)。

Write 调用可能修改保存地址的变量或字段，编译器便不再认为先前的非空检查仍然有效。通过动态索引或原生成员取得指针时，先保存为局部指针变量，再检查这个变量，确保非空检查与解引用使用同一次求值的结果。

## 指针不管理目标的生命周期

复制 ptr 只会复制地址；Take ptr 会使原来的指针变量不可用。两者都不释放所指对象，其他指针副本也不会自动变成空指针。非空只说明地址不是 nullptr，不代表所指对象仍然存活。

addressof 不延长目标的生命周期。函数返回 `addressof(local)` 不会被 Carven 拒绝，但函数返回后这个地址就悬空了。转移一个值后，不要再使用之前取得的该值地址，即使原变量后来又被赋值。原生目标释放后，也不要继续解引用。其他指针操作见[指针参考](/zh/reference/pointers/)。

## 练习

在 address.cv 中删除 level 里的 `nullptr` 判断，应得到 `CV-PTR-NONNULL`。把 `var stock` 改成 `let stock`，`addressof(&stock)` 处应报告 `CV-ACCESS-IMMUTABLE`。在原生程序中把目标类型改成 `ptr<i32>`：读取仍可用，写入会得到访问错误。
