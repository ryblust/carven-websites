---
title: 读取、修改与转移
description: 用一个库存例子理解 Read、非独占 Write、显式 Take 和恢复。
section: learn
lesson: 5
source: docs/semantics.md
---

## 三种访问分别写出来

```carven
fn read_stock(stock: i32) -> i32 => stock;

fn restock(&stock: i32, amount: i32) {
    stock += amount;
}

fn dispatch(&&stock: i32) -> i32 => stock;

fn main() {
    var stock = 7;
    let snapshot = read_stock(stock);

    restock(&stock, 2);
    let sent = dispatch(&&stock);

    stock = 1;

    println(snapshot, sent, stock);
}
```

输出 `7 9 1`。Read 允许读取，Write 借用可写存储，Take 转移完整 owner。调用处必须重复参数访问标记。

stock 在 dispatch 后不可用，普通完整赋值恢复 var。即使 i32 可复制，Take 仍改变源可用性。let 不能通过赋值恢复，因为它不可写。

## 复制不是转移

`let copy = owner;` 默认复制立即值，源仍可用。`let moved = &&owner;` 转移，使源不可用。String 副本拥有独立字节；如果复制的是视图，副本仍指向原 backing。

Carven 不提供字段或数组元素的局部 Take。Read/Write 参数、范围绑定、捕获和常量也不是 Take 源。需要转移聚合时传整个 owner。

## Write 可以别名

多个 Write 参数可以指向同一可变存储，修改按函数体顺序发生。Write 不是独占引用。与此同时，存在只读文本/切片借用时，实际写入仍会被禁止。

Read i32 保存实参值；Read 数组和 String 保持所选存储，后续别名修改可能影响它们被读取时的内容。想保留独立文本快照，先复制 String owner。

## 求值期间的冲突

同一调用同时 `read_then_take(value, &&value)` 会冲突，因为前面的访问仍由未完成调用保持。先计算独立结果再 Take 可以合法，例如传入 `value + 1`。如果有视图指向 value，简单复制视图不能解除借用。

局部 owner 在作用域退出时清理。return、失败、break 等转移也结束所离开作用域的局部生命周期。把视图保存到更外层不会延长它的源寿命。

## 练习

删除 `stock = 1;`，再尝试 println stock，应得到不可用诊断。将送货改为普通 Read，则源不再被转移；比较这两种接口表达的调用者义务。
