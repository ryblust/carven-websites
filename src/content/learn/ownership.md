---
title: "Read, update, and transfer values"
description: "Use an inventory example to understand Read, nonexclusive Write, explicit Take, and restoration."
section: learn
lesson: 5
source: docs/semantics.md
---

## Spell out the three access modes

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

The output is `7 9 1`. Read permits reading, Write borrows writable storage, and Take transfers a whole owner. Repeat the parameter access markers at the call site.

stock becomes unavailable after dispatch. A complete ordinary assignment restores a var. Even for copyable i32, Take changes source availability. A let cannot be restored by assignment because it is not writable.

## Copying is not transferring

`let copy = owner;` copies the immediate value by default and leaves the source available. `let moved = &&owner;` transfers it and makes the source unavailable. A String copy owns independent bytes; a copied view still refers to its original backing.

Carven does not allow a partial Take of a field or array element. Read/Write parameters, range bindings, captures, and constants are not Take sources either. To transfer an aggregate, pass its whole owner.

## Write may alias

```carven
fn replenish(&first: i32, &second: i32) {
    first += 2;
    second += 3;
}

fn main() {
    var stock = 4;
    replenish(&stock, &stock);
    println(stock);
}
```

The output is `9`: both parameters refer to stock, so the second update sees the first. The two `&` markers make both writable accesses visible at the call.

Multiple Write parameters can refer to the same mutable storage. Updates occur in body order. Write is not an exclusive reference. At the same time, an active read-only text or slice borrow still prevents an actual write.

Read i32 saves the argument value. Read arrays and String retain the selected storage; later aliased writes can affect what a subsequent read observes. To keep an independent text snapshot, copy the String owner first.

## Conflicts during evaluation

`read_then_take(value, &&value)` conflicts: the earlier access is still held by the unfinished call. Computing an independent result before Take can be valid, for example by passing `value + 1`. If a view points into value, copying that view does not remove the borrow.

Local owners are cleaned up when their scopes end. return, failure, break, and other transfers also end the lifetimes of locals in the scopes they leave. Storing a view in an outer scope does not extend the source's lifetime.

## Who keeps borrowed storage valid

Both versions read a text view, then append after the view leaves its scope. Save the Carven version as borrow.cv and the C++ version as borrow.cpp.

<div class="code-comparison" role="region" aria-label="Choose code language">
<div data-code-choice="Carven">

Carven

```carven
fn main() {
    var text = String::from_str("Carven");
    if !text.is_empty() {
        let view = text.as_str();
        println(view);
    }
    text.append(" + C++");
    println(text);
}
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

Now move append into the inner scope, before println(view). Carven reports `CV-ACCESS-BORROW-CONFLICT`: view still holds a read-only borrow, so its owner cannot be modified. Restore the original scope order to fix it; copying view does not release the original borrow.

C++ string_view also provides a lightweight non-owning view, but the type itself does not enforce these borrowing rules. Appending can invalidate its backing storage; do not run the modified C++ version to decide whether it is safe. Projects can also constrain such use through API design, static analysis, or other abstractions.

**The benefit here is checking the caller's obligations.** Carven tracks known owners and borrowing relationships; C++ continues to provide native storage and execution. This does not prove arbitrary external C++ pointers valid: providers and callers still have obligations at the native boundary. See the [ownership Reference](/reference/ownership/) for the rules.

## Exercise

Remove `stock = 1;` and try printing stock. Expect an unavailable-owner diagnostic. Change the delivery operation to ordinary Read so it no longer transfers the source, and compare the caller obligations expressed by the two interfaces.
