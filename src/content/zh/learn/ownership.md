---
title: "读取、修改与转移值"
description: "选择函数读取、修改还是取走一个值，并让借用的数据保持有效。"
section: learn
lesson: 6
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

在 Carven 仓库根目录运行 `./xmakew run carven access.cv`，输出 `7 9 1`。read_stock 不改变 stock，restock 把它从 7 改为 9，dispatch 则取走它的值。调用者必须先重新赋值，才能再次读取 stock。这三种方式分别叫 Read、Write、Take。调用处重复参数标记，让读代码的人看得见授予了哪种访问。

stock 在 dispatch 后不可用，普通完整赋值恢复 `var`。即使 `i32` 可复制，Take 仍改变源可用性。`let` 不能通过赋值恢复，因为它不可写。

## 复制不是转移

局部变量负责保管自己存放的值，这样的变量称为拥有者（owner）。`let copy = value;` 创建另一个值，原变量仍可使用。对于 String，副本有独立的文本字节；对于 Vector，副本有独立的元素。`let moved = &&value;` 则把值交出去，原变量随后不能再使用。

返回一个命名变量时也默认复制。函数要把已经构造好的结果交给调用者时，写 `return &&result;`。后面创建集合的函数会使用这种返回方式。

Take 交出的是一个完整拥有的值，不能只抽走某个字段，却让原记录继续可用。如果只需要该字段，先放弃整条记录，再选择字段：

```carven
struct Order {
    label: String,
    quantity: i32,
}

let order = Order { label: "bolts", quantity: 3 };
let label = (&&order).label;
println(label);
```

输出 `bolts`。String 是自己保存内容的文本类型，下一章会详细介绍。执行 `(&&order).label` 后，label 得到文本，order 不能再使用，不需要的 quantity 正常清理。若写普通的 `order.label`，则复制标签，order 仍可使用。只负责读取或修改调用者数据的参数不能把它取走；Take 参数才有这项权限。

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

两个操作有意共用一个计数器时，这种接口很直接。Write 允许共享，并不承诺独占访问。若还有只读文本或切片视图，可能使视图失效的修改仍会被禁止。

读取数字时，为本次调用保存该数值；读取 String 或数组时，不会为读取而复制全部内容。如果另一个参数修改同一份数据，后面的读取可能看到修改结果。需要保留之前的内容时，应先创建独立副本。

## 求值期间的冲突

同一调用同时 `read_then_take(value, &&value)` 会以 `CV-ACCESS-OPERATION-CONFLICT` 冲突，因为前面的访问仍由未完成调用保持。先计算独立结果再 Take 可以合法，例如传入 `value + 1`。如果有视图指向 value，简单复制视图不能解除借用。

离开作用域时，其中的局部值会被清理；return 或 break 提前离开也一样。即使把视图保存在更长久的位置，也不能借此延长原数据的生命期。

## 借用期间谁来保证存储有效

两个文本副本需要各自使用时，复制很方便。若函数只想读取现有文本，视图可以省去复制。视图指向原 String，所以视图存在时，原 String 必须保持存活且不能修改。

保存为 borrow.cv：

```carven
var text: String = "Carven";
if !text.is_empty() {
    let view = text.as_str();
    println(view);
}
text.append(" + C++");
println(text);
```

先输出 `Carven`，再输出 `Carven + C++`。内层花括号限制 view 的生命期。离开花括号后，append 就能安全修改 text。把 append 移到内层、放在 println(view) 前面，编译器会报告 `CV-ACCESS-BORROW-CONFLICT`：修改原文本可能使视图失效。复制视图既不复制文本，也不解除这个限制。

文本章节会继续讲怎样选择独立副本或借用视图。Carven 检查已知 String 与切片的借用关系；外部指针仍需要[所有权参考](/zh/reference/ownership/)中说明的生命周期保证。

## 用类把字段藏起来

类把私有字段和允许使用它们的操作放在一起，接收者沿用同样的三种访问方式。保存为 `stock.cv`：

```carven
class Stock {
    units: i32,

    fn new(units: i32) -> Stock => { units: units };
    fn level(self) -> i32 => self.units;

    fn restock(&self, amount: i32) {
        self.units += amount;
    }

    fn dispatch(&&self) -> i32 => self.units;
}

var stock = Stock::new(7);
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

只有类体内的代码能读取 units 或构造 Stock。外部代码通过 `Stock::new` 创建值；这是一个没有接收者的关联操作。`self` 读取接收者，`&self` 写入接收者，`&&self` 取走接收者。方法调用不必为接收者写标记，但访问规则仍然适用。`stock.restock(2)` 要求 var。执行 `stock.dispatch()` 后，须先给 stock 赋新值再使用，例如 `stock = Stock::new(1);`。

类仍是普通值。声明类本身不会引入堆分配、继承或虚调用；其内容如何复制和清理由字段类型决定。打印只显示类名，也没有隐式 `==`；需要比较时自己定义操作。完整的类规则见[聚合类型参考](/zh/reference/aggregates/)。

## 交出一份结果，保留另一份

元组可以同时带回标签与数量。若下一步只需要标签，而你还要使用数量，先为它们分别命名：

```carven
fn finish(&&label: String) -> String => &&label;

let (label, count) = ("accepted" as String, 3);
let delivered = finish(&&label);
println(delivered, count);
```

输出 `accepted 3`。Take 之后 label 不再可用，但 count 仍是一个可使用的独立值。分别命名两部分，就能交出其中一部分而保留另一部分。元组参数也能给各部分命名，访问方式仍由参数标记决定，详见[聚合类型参考](/zh/reference/aggregates/)。

## 不固定类型地传递一个值

包装函数有时只需要传递完整结果，不关心它具体是什么类型。前面泛型记录中的类型参数 T，也可以让函数保留调用者的类型：

```carven
fn relay<T>(&&value: T) -> T => &&value;

let label: String = "accepted";
let delivered = relay(&&label);
println(delivered);
```

输出 `accepted`，编译器推断 T 为 String。relay 接过标签，再把它交给调用者，原来的 label 随后不再可用。函数不能假设每一种 T 都可复制，但 Take 参数给了它一个可完整转交的值。需要为多种拥有结果编写同一种包装时，可以使用这个模式。

## 练习

从 access.cv 删除 `stock = 1;`，再尝试打印 stock，应得到 `CV-ACCESS-UNAVAILABLE`。将送货改为普通 Read，则源不再被转移；比较这两种接口表达的调用者义务。然后在 stock.cv 顶层打印 `stock.units`，应得到 `CV-ACCESS-CLASS-PRIVATE`；把 `var stock` 改成 `let stock`，`stock.restock(2)` 处应报告 `CV-ACCESS-IMMUTABLE`。
