---
title: "Read, update, and transfer values"
description: "Use an inventory example to understand Read, nonexclusive Write, explicit Take, restoration, and class receivers."
section: learn
lesson: 6
source: docs/language/ownership.md
---

## Spell out the three access modes

Save this as `access.cv`:

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

From the Carven repository root, run `./xmakew run carven access.cv`. The output is `7 9 1`. Read permits reading, Write borrows writable storage, and Take transfers a whole owner. Repeat the parameter access markers at the call site.

stock becomes unavailable after dispatch. A complete ordinary assignment restores a `var`. Even for copyable `i32`, Take changes source availability. A `let` cannot be restored by assignment because it is not writable.

## Copying is not transferring

`let copy = owner;` copies the immediate value by default and leaves the source available. `let moved = &&owner;` transfers it and makes the source unavailable. A `String` copy owns independent bytes; a copied view still refers to its original backing. Returning a named owner also copies it: write `return &&owner;` to request transfer. `CV-LINT-RETURN-COPY` warns about eligible returns of Carven-owned text. Take changes source availability; it does not promise a particular native move constructor or number of constructor calls.

Take always starts from a complete owner. `&&order.label` is rejected with `CV-ACCESS-TAKE-OPERAND` because it would take one field and leave the rest of order in place. To keep only one field, consume the owner and then select the field:

```carven
struct Order {
    label: String,
    quantity: i32,
}

let order = Order { label: "bolts", quantity: 3 };
let label = (&&order).label;
println(label);
```

This prints `bolts`. `(&&order)` makes order unavailable; label receives the `String` and the remaining quantity field is cleaned up normally. Plain `order.label` is still an ordinary Read and leaves order available. Read/Write parameters, range bindings, captures, and constants are not Take sources.

## Write may alias

```carven
fn replenish(&first: i32, &second: i32) {
    first += 2;
    second += 3;
}

var stock = 4;
replenish(&stock, &stock);
println(stock);
```

The output is `9`: both parameters refer to stock, so the second update sees the first. The two `&` markers make both writable accesses visible at the call.

Multiple Write parameters can refer to the same mutable storage. Updates occur in body order. Write is not an exclusive reference. At the same time, an active read-only text or slice borrow still prevents an actual write.

Read `i32` saves the argument value. Read arrays and `String` retain the selected storage; later aliased writes can affect what a subsequent read observes. To keep an independent text snapshot, copy the `String` owner first.

## Conflicts during evaluation

`read_then_take(value, &&value)` conflicts with `CV-ACCESS-OPERATION-CONFLICT`: the earlier access is still held by the unfinished call. Computing an independent result before Take can be valid, for example by passing `value + 1`. If a view points into value, copying that view does not remove the borrow.

Local owners are cleaned up when their scopes end. return, failure, break, and other transfers also end the lifetimes of locals in the scopes they leave. Storing a view in an outer scope does not extend the source's lifetime.

## Who keeps borrowed storage valid

Both versions read a text view, then append after the view leaves its scope. Save the Carven version as borrow.cv and the C++ version as borrow.cpp.

<div class="code-comparison" role="region" aria-label="Choose code language">
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

C++20 · Handwritten equivalent

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

From the Carven repository root, run `./xmakew run carven borrow.cv`. Build the C++ version with `c++ -std=c++20 borrow.cpp -o borrow`, then run `./borrow`. Both print:

```text
Carven
Carven + C++
```

Now move append into the inner scope, before `println`(view). Carven reports `CV-ACCESS-BORROW-CONFLICT`: view still holds a read-only borrow, so its owner cannot be modified. Restore the original scope order to fix it; copying view does not release the original borrow.

C++ string_view also provides a lightweight non-owning view, but the type itself does not enforce these borrowing rules. Appending can invalidate its backing storage; do not run the modified C++ version to decide whether it is safe. Projects can also constrain such use through API design, static analysis, or other abstractions.

**The benefit here is checking the caller's obligations.** Carven tracks known owners and borrowing relationships; C++ continues to provide native storage and execution. This does not prove arbitrary external C++ pointers valid: providers and callers still have obligations at the native boundary. Read, Write, and Take also do not establish cross-thread safety; Carven has no thread operations, and native code that shares data between threads owns its synchronization. See the [ownership Reference](/reference/ownership/) for the rules.

## Keep fields behind a class

A class groups private fields with the operations allowed to use them. Its receivers use the same three access modes. Save this as `stock.cv`:

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

Run `./xmakew run carven stock.cv`. The output is:

```text
Stock 9
9
```

Only code inside the class body can read `units` or construct a Stock, so other code goes through `Stock::create`, an associated operation without a receiver. `self` reads the receiver, `&self` writes it, and `&&self` takes it. The call spells no marker for the receiver, but the rules still apply: `stock.restock(2)` needs a `var`, and after `stock.dispatch()` stock is unavailable until a complete assignment such as `stock = Stock::create(1);` restores it.

A class is still a plain value: no heap allocation, inheritance, or virtual calls. Copying and cleanup follow its field types. Printing shows only the class name, and there is no implicit `==`; define an operation when a comparison is needed. See the [aggregate Reference](/reference/aggregates/) for the full class rules.

## Exercise

Remove `stock = 1;` from access.cv and try printing stock. Expect `CV-ACCESS-UNAVAILABLE`. Change the delivery operation to ordinary Read so it no longer transfers the source, and compare the caller obligations expressed by the two interfaces. Then, in stock.cv, print `stock.units` at top level and expect `CV-ACCESS-CLASS-PRIVATE`; change `var stock` to `let stock` and expect `CV-ACCESS-IMMUTABLE` at `stock.restock(2)`.
