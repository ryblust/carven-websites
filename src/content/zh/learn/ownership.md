---
title: "读取、修改与转移值"
description: 用一个库存例子理解 Read、非独占 Write、显式 Take、恢复和类的接收者。
section: learn
lesson: 5
source: docs/language/ownership.md
---

## 三种访问分别写出来

保存为 `access.cv`：

```carven
fn read_stock(stock: i32) -> i32 => stock;

fn restock(&stock: i32, amount: i32) {
    stock += amount;
}

fn dispatch(&&stock: i32) -> i32 => stock;

var stock = 7;
let snapshot = read_stock(stock);

restock(&stock, 2);
let sent = dispatch(&&stock);

stock = 1;

println(snapshot, sent, stock);
```

在 Carven 仓库根目录运行 `./xmakew run carven access.cv`，输出 `7 9 1`。Read 允许读取，Write 借用可写存储，Take 转移完整 owner。调用处必须重复参数访问标记。

stock 在 dispatch 后不可用，普通完整赋值恢复 `var`。即使 `i32` 可复制，Take 仍改变源可用性。`let` 不能通过赋值恢复，因为它不可写。

## 复制不是转移

`let copy = owner;` 默认复制立即值，源仍可用。`let moved = &&owner;` 转移，使源不可用。`String` 副本拥有独立字节；如果复制的是视图，副本仍指向原 backing。返回命名 owner 也会复制；要转移则写 `return &&owner;`。`CV-LINT-RETURN-COPY` 会提醒满足条件的 Carven 自有文本返回。Take 改变源码中值的可用状态，不承诺某个原生移动构造函数或固定构造次数。

Take 总是从完整 owner 开始。`&&order.label` 会以 `CV-ACCESS-TAKE-OPERAND` 被拒绝，因为它只取走一个字段，却把 order 的其余部分留在原处。只想保留一个字段时，先消耗 owner，再选择字段：

```carven
struct Order {
    label: String,
    quantity: i32,
}

let order = Order { label: "bolts", quantity: 3 };
let label = (&&order).label;
println(label);
```

输出 `bolts`。`(&&order)` 使 order 不可用；label 得到那个 `String`，剩下的 quantity 字段照常清理。普通的 `order.label` 仍是 Read，不会让 order 失效。Read/Write 参数、范围绑定、捕获和常量都不是 Take 源。

## Write 可以别名

```carven
fn replenish(&first: i32, &second: i32) {
    first += 2;
    second += 3;
}

var stock = 4;
replenish(&stock, &stock);
println(stock);
```

输出 `9`：两个参数都指向 stock，第二次修改能看到第一次的结果。调用处的两个 `&` 明确标出可写访问。

多个 Write 参数可以指向同一可变存储，修改按函数体顺序发生。Write 不是独占引用。与此同时，存在只读文本/切片借用时，实际写入仍会被禁止。

Read `i32` 保存实参值；Read 数组和 `String` 保持所选存储，后续别名修改可能影响它们被读取时的内容。想保留独立文本快照，先复制 `String` owner。

## 求值期间的冲突

同一调用同时 `read_then_take(value, &&value)` 会以 `CV-ACCESS-OPERATION-CONFLICT` 冲突，因为前面的访问仍由未完成调用保持。先计算独立结果再 Take 可以合法，例如传入 `value + 1`。如果有视图指向 value，简单复制视图不能解除借用。

局部 owner 在作用域退出时清理。return、失败、break 等转移也结束所离开作用域的局部生命周期。把视图保存到更外层不会延长它的源寿命。

## 借用期间谁来保证存储有效

这里两边都先读取文本视图，等视图离开作用域后再追加文本。保存 Carven 版本为 borrow.cv；C++ 版本为 borrow.cpp。

<div class="code-comparison" role="region" aria-label="切换代码语言">
<div data-code-choice="Carven">

Carven

```carven
var text: String = "Carven";
if !text.is_empty() {
    let view = text.as_str();
    println(view);
}
text.append(" + C++");
println(text);
```

</div>
<div data-code-choice="C++">

C++20 · 手写等价示例

```cpp
#include <iostream>
#include <string>
#include <string_view>

int main() {
    std::string text = "Carven";
    if (!text.empty()) {
        std::string_view view = text;
        std::cout << view << '\n';
    }
    text.append(" + C++");
    std::cout << text << '\n';
}
```

</div>
</div>

在 Carven 仓库根目录运行 `./xmakew run carven borrow.cv`。C++ 版本用 `c++ -std=c++20 borrow.cpp -o borrow` 构建，再运行 `./borrow`。两边依次输出：

```text
Carven
Carven + C++
```

现在把 append 移到内层作用域中，放在 `println`(view) 之前。Carven 会报告 `CV-ACCESS-BORROW-CONFLICT`：view 的只读借用仍然存活，不能修改其 owner。恢复原来的作用域顺序即可；复制一份 view 不会解除原有借用。

C++ 的 string_view 同样提供轻量的非拥有视图，但这个类型本身不强制执行上述借用规则。追加可能使其指向的存储失效；这里不要运行修改后的 C++ 版本来判断它是否安全。项目也可以通过 API 设计、静态分析或其他封装约束这类使用。

**这里的收益是编译器能检查调用者的责任。** Carven 的分析跟踪已知的 owner 与借用关系，C++ 继续提供原生存储与执行机制。这不意味着 Carven 能证明任意外部 C++ 指针都有效；原生边界仍有提供者与调用者的责任。Read、Write 和 Take 也不提供跨线程安全保证：Carven 没有线程操作，在线程间共享数据的原生代码自行负责同步。具体规则见[所有权参考](/zh/reference/ownership/)。

## 用类把字段藏起来

类把私有字段和允许使用它们的操作放在一起，接收者沿用同样的三种访问方式。保存为 `stock.cv`：

```carven
class Stock {
    units: i32,

    fn create(units: i32) -> Stock => { units: units };
    fn level(self) -> i32 => self.units;

    fn restock(&self, amount: i32) {
        self.units += amount;
    }

    fn dispatch(&&self) -> i32 => self.units;
}

var stock = Stock::create(7);
stock.restock(2);
println(stock, stock.level());

let sent = stock.dispatch();
println(sent);
```

运行 `./xmakew run carven stock.cv`，输出：

```text
Stock 9
9
```

只有类体内的代码能读取 `units` 或构造 Stock，因此外部代码通过 `Stock::create` 创建值；它没有接收者，是关联操作。`self` 读取接收者，`&self` 写入接收者，`&&self` 取走接收者。调用时不必为接收者写标记，但规则照样适用：`stock.restock(2)` 需要 `var`；`stock.dispatch()` 之后 stock 不可用，直到 `stock = Stock::create(1);` 这样的完整赋值把它恢复。

类仍是普通值：没有堆分配、继承或虚调用，复制和清理由字段类型决定。打印只显示类名，也没有隐式 `==`；需要比较时自己定义操作。完整的类规则见[聚合类型参考](/zh/reference/aggregates/)。

## 练习

从 access.cv 删除 `stock = 1;`，再尝试打印 stock，应得到 `CV-ACCESS-UNAVAILABLE`。将送货改为普通 Read，则源不再被转移；比较这两种接口表达的调用者义务。然后在 stock.cv 顶层打印 `stock.units`，应得到 `CV-ACCESS-CLASS-PRIVATE`；把 `var stock` 改成 `let stock`，`stock.restock(2)` 处应报告 `CV-ACCESS-IMMUTABLE`。
