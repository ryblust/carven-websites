---
title: "复合类型"
description: 构造次序、值类、上下文构造、边界检查、枚举载荷和递归存储。
section: reference
lesson: 10
source: docs/language/aggregates.md
---

把相关数据组合起来时，可以按用途选择：struct 为字段命名，元组按位置保存不同类型，数组固定长度，Vector 可以增长，enum 表示几种可能情况。class 则在字段外提供操作，控制外部如何使用数据。

## 结构体

结构体把相关值组成具名字段，每个声明都定义独立类型。位置构造按字段声明顺序提供值，具名构造按字段名对应。位置构造和没有默认标记的具名构造必须为每个字段提供一次值。具名列表末尾的 `...` 为所有遗漏字段请求类型默认初始化，与字段位置无关；只有遗漏字段须有默认值。标记只能出现一次、必须位于末尾且后面没有逗号。显式表达式按书写顺序求值，然后按声明顺序初始化遗漏字段。空 `T {}` 默认初始化整个值。重复、未知、多余或类型不兼容的初始化器均无效。

```carven run
struct Config { attempts: i32, enabled: bool, label: String }
let empty = Config {};                    // 0, false, empty String
let named = Config { attempts: 3, enabled: true, label: {} };
let positional = Config { 3, true, String {} };
let partial: Config = { enabled: true, ... };
println(empty.attempts, named.attempts, positional.attempts); // 0 3 3
```

## 普通值类

类保存一个普通值，字段只能在类内部访问。它不会因为使用 class 就自动变成堆对象，也不引入继承或虚派发。复制和转移仍遵循普通值规则。字段只在类体可访问，未写 private 的操作与类使用相同可见范围，`private fn` 仅类体可访问。操作与字段共用唯一名字空间，不支持重载或隐式 self 查找。

```carven run
class Counter {
    value: i32,

    const fn new(value: i32) -> Counter => { value: value };
    const fn read(self) -> i32 => self.value;
    fn increment(&self) { self.value += 1; }
}

const initial = Counter::new(3);
var counter = initial;
counter.increment();
println(counter.read()); // 4
```

`Type::new(...)` 是返回完整值的普通关联工厂。`new` 是惯例名称；其他工厂可以使用 `parse`、`open`、`from_str` 等名字。没有接收者参数的操作通过 `Type::name(...)` 调用；同步关联操作也能作为可调用值使用。实例用 `value.name(...)`，接收者求值一次且先于显式实参。首参数 `self/&self/&&self` 无类型注解，分别使用 Read/Write/Take；实例操作不能取为独立值。

关联操作可为 async，使用冷异步操作与 await 规则；带实例接收者的 async 操作不支持。类可有 const fn 操作，适用普通能力、私有可见性及冻结规则；类内局部常量仍可访问该类的私有字段。嵌套声明、类表示模式及 C++ 导入/导出操作不支持。类没有默认值，也不支持相等；结构显示只显示类名。

类操作继承所属类的类型与失败集合参数，还可声明自己的参数，并由显式实参推断或通过 `value.forward<U>(...)` 指定。泛型函数体按参数能力检查一次；没有额外参数的具体关联操作可以选为普通可调用值。

## 上下文构造

已知期望结构体或可访问类类型时，`{ field: value }` 可省略类型；`{ enabled: true, ... }` 默认初始化遗漏字段，`{}` 默认初始化整个值。上下文来自注解、实参、返回、字段、数组/元组元素和结果分支。无上下文时省略类型非法；位置构造保留显式类型，不能混用位置和名字。具名初始化按书写顺序求值。

## 默认初始化

| 类型                   | 默认值                                         |
| ---------------------- | ---------------------------------------------- |
| bool、整数、浮点、char | false、零、正零、U+0000                        |
| str / String           | 空文本；String 使用独立存储                    |
| ptr                    | 空地址，仍适用非空检查                         |
| 切片                   | 空只读切片                                     |
| Vector                 | 拥有自身存储的空序列，不要求元素有默认值       |
| Range                  | 从零到零的空半开区间                           |
| void                   | `()`                                           |
| 非空元组、结构体       | 每个元素/字段递归默认初始化                    |
| 固定数组               | 每个元素独立默认初始化；零长度不要求元素默认值 |
| 原生 C++ 类型          | 由 C++ 检查的原生值初始化                      |

类、枚举和可调用值无默认值；包含这些成员的结构体或非空数组也无默认值。`CV-TYPE-DEFAULT-INITIALIZATION` 标识不可用的默认构造。泛型 `Vector<T>` 与 `[T; 0]` 不要求未知 T 有默认值。

## 固定数组

数组类型 `[T; N]` 有固定元素类型和编译期非负长度。`[a, b]` 在没有期望上下文时推断非空数组；期望数组要求精确长度，期望切片借用对应存储，期望 Vector 则构造具有独立存储的动态数组。`[]` 需要 `[T; 0]`、`[T]` 或 `Vector<T>` 上下文。零长度数组形成的空切片不保留底层存储。

`[expression; N]` 按索引顺序把表达式重新求值 N 次，每次都遵循普通访问和生命周期规则。N 为零时仍检查表达式并取得类型，但不执行；不要求元素默认值。中途失败停止后续元素并清理已完成元素。展开受构造预算限制。

```carven run
fn next_value(&next: i32) -> i32 {
    next += 1;
    return next;
}

var next = 0;
let samples = [next_value(&next); 4];
println(samples.length(), samples[3]); // 4 4
```

数组直接提供 `length()` 与 `is_empty()`，接收者仍只求值一次，包括其中的副作用或失败。索引为整数；已知越界在分析期诊断，动态越界确定性终止。接收者先于索引且各求值一次。写元素要求可写接收者。转移整个数组后再选取元素，会得到独立值；已有数组存储的索引遵循 Read 复制规则；切片总是选择借用元素，即使切片视图本身已被 Take。

数组按元素支持相等，包括零长数组仍要求元素类型支持相等；结构体无相等。名义类型不可经字段、载荷、数组形成按值存储环，零长数组仍贡献元素边；函数签名不贡献存储边。

## 元组

元组按顺序保存可以具有不同类型的元素，类型和值分别如 `(i32, str)` 与 `(20, "answer")`。嵌套层次保留，元素从左到右各求值一次，已有元组上下文按位置提供类型。`(x)` 分组，`(x,)` 单元素，`()` 为 void 单元值。非空元组中的 void 保留逻辑位置。

```carven run
var (number, _, (text,)): (i32, void, (str,)) = (42, (), ("ready",));
number += 1;
println(number, text); // 43 ready
```

局部 let/var/const 接受递归元组目标，要求元素数量与嵌套层次一致。运行时每个绑定都独立拥有对应的值，可变性由声明决定；Take 一个绑定不影响同级绑定。`let (a, b) = owner` 复制，`let (a, b) = &&owner` 转移整个源所有者。初始化器求值一次，元素存储稳定到绑定作用域结束，丢弃元素也活到该时刻。局部 const 将源冻结一次后绑定对应常量元素。

位置字段为 `pair.0`、`nested.1.0`、`pair.0.method()`；位置使用无前导零/下划线/后缀/指数的十进制。越界包括在 `()` 上选位置均分析期拒绝。元组没有动态索引；指针 `p->0` 等于 `(*p).0`。

位置字段继承 Read/Write，接收者只求值一次；不能从可用完整所有者写 `&&pair.0`。`(&&pair).0` 先转移完整元组再返回字段，剩余元素在完整表达式结束时清理。

函数/lambda 参数可用递归元组目标，仍是一个完整的元组参数。Read/Write 绑定访问参数的现有存储，Take 名字为独立不可变所有者。静态参数保留静态值规则。范围循环可分解数组或切片中的元组元素，继承当前元素访问且不可 Take；这不使元组本身可迭代。元组及枚举载荷模式递归匹配，`()` 匹配单元值、`(p)` 分组、`(p,)` 匹配单元素。

## 动态数组 Vector

`Vector<T>` 拥有一段连续的已初始化元素及其内部数据，支持独立复制、整个所有者的 Take、检查过的 Read/Write 索引和迭代。递归结构体与枚举可含自身类型的 Vector。裸指针元素仍只复制地址。

```carven run
var numbers: Vector<i32> = [10, 20, 30];
numbers.push(40);
let removed = numbers.remove(1);
let tail: [i32] = numbers.slice(1, 3);
println(removed, tail[0]); // 20 30
```

| 操作                                                      | 访问与结果                                              |
| --------------------------------------------------------- | ------------------------------------------------------- |
| `Vector<T>::new() -> Vector<T>`                           | 空动态数组，容量为零                                    |
| `Vector<T>::from_slice(values: [T]) -> Vector<T>`         | 独立复制元素，返回具有独立存储的容器                    |
| `Vector<T>::with_capacity(minimum: usize) -> Vector<T>`   | 空动态数组，容量至少为所需值                            |
| `v.length() -> usize` / `v.is_empty() -> bool`            | Read；元素数 / 是否为空                                 |
| `v.capacity() -> usize`                                   | Read；以元素为单位的容量                                |
| `v.reserve(minimum: usize) -> void`                       | Write；确保总容量至少为 minimum，保留内容               |
| `v.push(value: T) -> void` / `v.push(&&value: T) -> void` | Write；复制或转移一个元素到末尾                         |
| `v.append(values: [T]) -> void`                           | Write；按顺序追加切片元素的独立副本                     |
| `v.remove(index) -> T`                                    | Write；提取元素并保持剩余顺序；索引接受任意标量整数类型 |
| `v.clear() -> void`                                       | Write；销毁元素并保留容量                               |
| `v.slice() -> [T]`                                        | Read；借用完整范围                                      |
| `v.slice(start: usize, end: usize) -> [T]`                | Read；借用半开子范围                                    |

索引须非负且小于 `length()`。运行时 `remove` 越界会终止执行，必需的静态执行则报诊断。所有方法都没有类型化失败。

字面量在 Vector 上下文中构造 Vector，已有数组/切片须用 from_slice。`Vector<T> {}` 与 `{}` 默认空序列，不要求元素默认值。增长因子未规定；容量内追加不重分配，remove/clear 保留容量，复制不承诺相同空余容量。分配失败与容量溢出终止，不产生声明的失败。

Vector 可直接适配 `[T]`。仍在使用的切片会保护整个源 Vector，禁止写入、替换、Take、销毁或结构变更，即使保留容量足够也如此。Read/Write 遍历都禁止结构变更，Write 可更新元素。不能 Take 索引元素，用 remove 提取。从同一个 Vector 的元素向末尾 push 时，允许的调用会先复制实参，再修改存储。

元素遵循各自的源或原生值语义。具名原生 C++ 元素的构造、复制、移动和析构由 C++ 检查，隐藏的存储与生命周期由提供者负责；复制原生对象引用只复制注册身份。借用文本、切片、可调用值、异步操作及包含它们的聚合不能作元素。原生表达式查询类型须先有显式具名存储类型。裸指针保留目标契约，`Vector<bool>` 有普通元素与 `[bool]` 视图，不提供裸指针提取或未初始化存储 API。解释执行要求支持元素值及原生叶子的显式宿主契约，注册原生叶子不能冻结为常量。

Vector 操作，包括容量操作，在元素值受支持时可用于原生、解释与编译期执行。保留的值与切片遵循[冻结规则](/zh/reference/constants/#常量结果与底层存储)和[执行预算](/zh/reference/constants/#执行预算)。

## 两类枚举

枚举是封闭的名义类型，至少有一个 case。所有 case 都无载荷时，它是数值枚举。默认底层类型为 `i32`，也可以显式指定其他整数类型。每个 case 有一个整数值：省略初始化器时，第一个从零开始，后续从前一个值加一。初始化值必须可表示，递增须不溢出，不同 case 不能有相同数值。数值 case 是常量，可用 `as` 转为整数；不支持整数到枚举的转换。

只要有一个 case 声明了位置载荷，整个枚举就是载荷枚举。它可以混合有载荷和无载荷 case，但不能指定底层类型、数值初始化器或转换为整数。载荷枚举没有默认值。载荷可复制时，有载荷 case 可选为使用 Read 参数的构造函数值；直接构造遵循普通值构造规则，完整 Take 可提供不可复制载荷。无载荷 case 是值。

```carven run
enum Status { Ready, Busy }
enum Reply { Empty, Number(i32) }

let status = Status::Busy;
let reply: Reply = .Number(42);
println(status as i32); // 1
match reply {
    .Empty => println("empty"),
    .Number(value) => println(value),
}
```

`.Case(arguments)` 与 `.Case` 需要期望枚举类型来确定所属声明。上下文可以来自带类型的绑定、返回、赋值、实参、聚合元素或无歧义的相邻操作数。编译器不按 case 名字进行全局搜索，也不能独立导入 case。无载荷 case 不能作为函数调用；有载荷 case 的实参数量须精确匹配。

## 递归存储与可见性

结构体/枚举的按值存储图须无环，指针、切片与 Vector 可以打断递归存储。公开声明的接口及嵌套类型，必须对该声明的使用者可见；类的私有字段仍遵循封装规则。

`append` 在调用期间借用输入，不修改输入；空切片保持容器不变。输入不能借用接收向量自己的存储。源元素的构造、复制、转移、修改、提取和切片在静态、解释和原生执行中使用相同规则；原生元素的语义执行需要相应宿主绑定。
