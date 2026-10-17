---
title: "Read, update, and transfer values"
description: "Choose whether a function reads, changes, or takes a value, and keep borrowed data valid."
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

From the Carven repository root, run `./xmakew run carven access.cv`. The output is `7 9 1`. read_stock leaves stock unchanged. restock changes it from 7 to 9. dispatch takes its value. Before reading stock again, the caller must assign a new value. These are Read, Write, and Take. A call repeats the parameter marker so the caller can see which access it grants.

stock becomes unavailable after dispatch. A complete ordinary assignment restores a `var`. Even for copyable `i32`, Take changes source availability. A `let` cannot be restored by assignment because it is not writable.

## Copying is not transferring

A local variable is responsible for the value it holds; we call it an owner. `let copy = value;` creates another value and leaves the original available. For String, that means independent text bytes; for Vector, independent elements. `let moved = &&value;` hands the value over and makes the original variable unavailable.

Returning a named variable also copies it. Use `return &&result;` when a function should hand its completed result to the caller. This is why the collection-building functions in later chapters return their result with &&.

Take hands over a whole owned value. It does not let you pull a field out while keeping the original record usable. If only the field is needed, first give up the complete record, then select the field:

```carven
struct Order {
    label: String,
    quantity: i32,
}

let order = Order { label: "bolts", quantity: 3 };
let label = (&&order).label;
println(label);
```

This prints `bolts`. String is text that owns its contents; the next chapter explains it in detail. After `(&&order).label`, label holds that text, order cannot be used again, and the unused quantity is cleaned up normally. Plain `order.label` would copy the label and leave order available. Parameters that only read or write a caller's value cannot take it away; a Take parameter can.

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

This is useful when two operations intentionally share a counter. Write allows that sharing; it does not promise exclusive access. A read-only text or slice view still prevents modifications that could invalidate it.

Reading a number saves its value for the call. Reading a String or array avoids copying all of its contents. If another argument changes that same data, later reads may see the change. Make a separate copy first when you need the earlier contents.

## Conflicts during evaluation

`read_then_take(value, &&value)` conflicts with `CV-ACCESS-OPERATION-CONFLICT`: the earlier access is still held by the unfinished call. Computing an independent result before Take can be valid, for example by passing `value + 1`. If a view points into value, copying that view does not remove the borrow.

Leaving a scope cleans up its local values. This also happens when return or break leaves that scope early. A view cannot keep its source alive simply by being stored somewhere that lasts longer.

## Who keeps borrowed storage valid

Copying text is useful when both copies need independent lives. When a function only needs to read existing text, a view avoids that copy. The view refers to the original String, so that String must stay alive and unchanged while the view exists.

Save this as borrow.cv:

```carven
var text: String = "Carven";
if !text.is_empty() {
    let view = text.as_str();
    println(view);
}
text.append(" + C++");
println(text);
```

The output is `Carven`, then `Carven + C++`. The inner braces limit the life of view. After those braces, append can change text safely. Move append inside the braces, before println(view), and the compiler reports `CV-ACCESS-BORROW-CONFLICT`: changing the original could invalidate the view. Copying the view does not copy the text or end that restriction.

The text chapter develops this choice between owning a copy and borrowing a view. Carven checks the known String and slice relationships; external pointers still require the lifetime guarantees described in the [ownership reference](/reference/ownership/).

## Keep fields behind a class

A class groups private fields with the operations allowed to use them. Its receivers use the same three access modes. Save this as `stock.cv`:

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

Run `./xmakew run carven stock.cv`. The output is:

```text
Stock 9
9
```

Only code inside the class body can read units or construct a Stock. Other code calls `Stock::new`. This associated operation has no receiver. `self` reads the receiver, `&self` writes it, and `&&self` takes it. A method call needs no receiver marker, but the access rules still apply. `stock.restock(2)` requires var. After `stock.dispatch()`, assign a new value before using stock again, for example `stock = Stock::new(1);`.

A class is still a value. Declaring one does not add heap allocation, inheritance, or virtual calls; its fields determine how the contents are copied and cleaned up. Printing shows only the class name, and there is no implicit `==`; define an operation when a comparison is needed. See the [aggregate Reference](/reference/aggregates/) for the full class rules.

## Keep one result while handing on another

A tuple can carry both a label and a count. Give them separate local names when the next step should receive the label but you still need the count:

```carven
fn finish(&&label: String) -> String => &&label;

let (label, count) = ("accepted" as String, 3);
let delivered = finish(&&label);
println(delivered, count);
```

It prints `accepted 3`. After Take, label is unavailable, but count is still a separate value. Naming the two parts lets you hand one on without losing access to the other. Tuple parameters can also name their parts; their access still follows the parameter marker, as described in the [aggregate reference](/reference/aggregates/).

## Hand on a value without fixing its type

A wrapper sometimes needs to pass along a whole result regardless of its type. T, the type parameter introduced with generic records, lets this function preserve the caller's type:

```carven
fn relay<T>(&&value: T) -> T => &&value;

let label: String = "accepted";
let delivered = relay(&&label);
println(delivered);
```

This prints `accepted`. The compiler infers T as String. relay takes the label and hands it to its caller; the original label is no longer available. The function cannot assume that every possible T can be copied, but its Take parameter gives it a complete value that it can transfer. Use the same pattern for a wrapper that should work with different owned result types.

## Exercise

Remove `stock = 1;` from access.cv and try printing stock. Expect `CV-ACCESS-UNAVAILABLE`. Change the delivery operation to ordinary Read so it no longer transfers the source, and compare the caller obligations expressed by the two interfaces. Then, in stock.cv, print `stock.units` at top level and expect `CV-ACCESS-CLASS-PRIVATE`; change `var stock` to `let stock` and expect `CV-ACCESS-IMMUTABLE` at `stock.restock(2)`.
