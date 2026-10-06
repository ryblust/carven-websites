---
title: 结构体、类、数组与枚举
description: 构造次序、值类、上下文构造、边界检查、枚举载荷和递归存储。
section: reference
lesson: 10
source: docs/language/aggregates.md
---

## 结构体

结构体是有序、字段名唯一的名义乘积类型。可以按声明顺序位置构造，或用字段名构造。非空构造必须恰好初始化每个字段一次，不能混合位置和命名形式。空的 `T {}` 请求整值默认初始化。结构体体内只容纳字段；需要私有字段和操作时使用[类](#普通值类)。

```carven
struct Point {
    x: i32,
    y: i32,
}

fn origin() -> Point => Point { 0, 0 };

fn sample() -> Point => { y: 2, x: 1 };
```

命名形式映射到字段声明，但初始化表达式仍按书写顺序求值。非空构造的重复、遗漏、多余、未知字段和不兼容值都报错。非空 Carven `T { ... }` 构造结构体，类只能在自身类体内构造；空构造也支持有默认值的内建类型。上下文能提供类型时可以省略类型，见[上下文构造](#上下文构造)。枚举和 callable 使用各自的表达式形式。外部 C++ 类型有单独的构造规则。

`origin` 的位置构造保留类型名；`sample` 的命名构造从声明的 `Point` 结果类型获得上下文。

结构体不支持 `==` 或 `!=`；需要比较时请显式比较字段。数组和枚举只有在元素或载荷支持相等时才支持相等。

## 默认初始化

`T {}` 对构造语法接受的类型请求整值默认初始化，例如 `i32 {}`、`String {}` 和有名结构体。下表也描述嵌套字段与元素的默认值，不引入数组或切片的构造语法。结构体字段按声明顺序递归初始化；非空构造不能通过省略字段请求部分默认值。

| 类型                        | 默认值                        |
| --------------------------- | ----------------------------- |
| 整数与浮点数                | 零；浮点数为正零              |
| SIMD 字节 / 浮点向量 / 掩码 | 全零 / 正零 / false lane      |
| `bool` / `char`             | false / U+0000                |
| `str` / `String`            | 空文本；`String` 拥有独立存储 |
| 指针                        | 空指针，仍受普通非空检查约束  |
| 切片                        | 空只读视图                    |
| 整数区间                    | 从零到零、不含终点的空区间    |
| 固定数组                    | 各元素独立初始化              |
| 结构体                      | 各字段递归初始化              |
| 外部 C++ 类型               | 原生值初始化，由 C++ 验证     |

普通类、数值与载荷枚举、callable 值及视图、void、入口或仅用于迭代的不透明类型没有默认值。包含它们的结构体或非空数组也没有默认值；零长度数组不要求元素可默认初始化。不支持的请求报告 `CV-TYPE-DEFAULT-INITIALIZATION`。

局部声明仍须提供初始化器，数组字面量仍须提供精确元素数。默认构造不延长借用、不放宽访问规则。运行时、解释和常量执行在各自支持子集内使用相同默认值；原生默认值仍委托 C++。

## 普通值类

`class` 是封装的名义值：字段私有，操作声明在类体内。它不引入堆分配、引用身份、继承、虚派发，也没有自定义复制、移动或析构钩子。复制、所有权、存储的借用和析构都由字段类型决定，规则与结构体相同。

```carven
class Counter {
    value: i32,

    fn create(value: i32) -> Counter => { value: value };
    fn read(self) -> i32 => self.value;

    fn increment(&self) {
        self.value += 1;
    }
}

var counter = Counter::create(3);
counter.increment();
println(counter.read(), counter); // 4 Counter
```

字段以逗号结尾（最后一个可省略），可与操作交错书写。类体内不能嵌套声明，也不能包含 `const fn` 或 C++ 导入/导出操作。

| 形式                   | 含义                                                                   |
| ---------------------- | ---------------------------------------------------------------------- |
| `fn name(params)`      | 关联操作，用 `Type::name(...)` 调用；`Type::name` 也是它的 callable 值 |
| `fn name(self, ...)`   | 以 Read 访问接收者的实例操作                                           |
| `fn name(&self, ...)`  | 以 Write 访问接收者的实例操作，保留原可更新位置                        |
| `fn name(&&self, ...)` | Take 整个 owner 的实例操作                                             |
| `private fn ...`       | 只能在本类体内访问                                                     |

首参数命名为 `self` 时必须省略类型标注，类操作的后续参数也不能命名为 `self`。自由函数参数或普通局部绑定名为 `self` 时不会获得接收者含义。

实例操作用 `expression.name(...)` 调用。接收者在显式实参之前求值一次，按普通 Read、Write 或 Take 规则绑定；显式实参仍需写自己的访问标记。实例操作不能单独取为值。没有 `static` 关键字、成员重载或隐式 `self` 查找：操作内部只能用 `self.field` 访问字段。

选择字段和构造表示只允许在定义该类的词法类体内进行。这项权限覆盖同类的其他值以及类操作中书写的 lambda，但不延伸到同模块的其他声明或它们调用的自由函数。在类体外写 `counter.value`、`Counter { value: 1 }` 或 `let c: Counter = {};` 报告 `CV-ACCESS-CLASS-PRIVATE`；从外部调用 `private fn` 也报告此代码。普通操作沿用类自身的 `private`/`export` 可见范围。操作不进入模块命名空间；字段与操作共用一个命名空间，名字必须唯一。

类体内的构造必须提供全部字段；类没有自动默认值，包含它的结构体或非空数组也不会自动构造它。因此，除非类没有字段，在返回自身类型的操作里写 `{}` 会报告 `CV-TYPE-DEFAULT-INITIALIZATION`。类型名不可调用。

类没有隐式相等：`a == b`，包括通过含类字段的结构体比较，都报告 `CV-TYPE-EQUALITY-UNSUPPORTED`。需要比较时请写一个操作。[结构化打印](/zh/reference/formatting/#结构化打印)只输出类名。必需的常量求值以 `CV-CONST-ADMISSION` 拒绝类值和类操作。没有类表示模式。生成的 C++ 把类操作表示为以接收者为参数的普通函数。

## 上下文构造

表达式已有已知期望类型时，构造可以省略类型：`{ field: value }` 按字段名构造，`{}` 请求默认值。字段检查、类表示访问、所有权、借用和常量执行准入都与写出类型的形式相同。命名字段必须写成 `field: value`，不支持 `{ quantity, amount }` 这样的简写。位置构造保留显式类型，`{ 1, 2 }` 是语法错误。

```carven
struct Point {
    x: i32,
    y: i32,
}

struct Segment {
    start: Point,
    end: Point,
}

fn origin() -> Point => { x: 0, y: 0 };

fn width(segment: Segment) -> i32 => segment.end.x - segment.start.x;

var text: String = {};
text.append("ok");
let points: [Point; 2] = [origin(), { x: 3, y: 4 }];
let segment = Segment { start: {}, end: points[1] };
println(text, width(segment), width({ start: origin(), end: { x: 5, y: 0 } }));
```

输出 `ok 3 5`。期望类型来自声明的函数和 callable 结果、带注解的绑定、赋值目标、已解析的 Carven 参数、记录字段和已知数组元素类型；值控制分支沿用外围期望类型。数组元素或分支的前向分析已确定的类型也可提供上下文。编译器不会搜索后续用途，`let point = { x: 1, y: 2 };` 报告 `CV-TYPE-CONSTRUCT-CONTEXT`。

没有按字段名的结构搜索，也不选择失败类型：`throw { code: 404 };` 同样报告 `CV-TYPE-CONSTRUCT-CONTEXT`，需写出失败类型。对 `-> T throw E`，返回的构造使用 `T`。原生 C++ 类型从不推断构造；外部结果类型的 `{}` 报告 `CV-TYPE-CONSTRUCT-CONTEXT`。

在 match 或 catch 分支体开头，`{ field: value }` 是构造，而 `{}` 是空分支块。空构造分支写作 `({})`：

```carven
fn pick(flag: bool) -> Point => match flag {
    true => { x: 1, y: 0 },
    false => ({}),
};
```

此片段使用上一例中的 `Point`。块体函数、if 分支和 try 体的花括号仍界定一个块；块的末尾表达式本身可以是上下文构造。

## 固定数组

`[T; N]` 的长度是非负常量表达式，元素类型和长度都属于类型身份。零长度数组仍保留元素类型和对应类型约束。

```carven
let values = [1, 2, 3];
let empty: [i32; 0] = [];
const extent = 3;
let typed: [i32; extent] = [4, 5, 6];
```

没有期望数组或切片类型时，数组字面量必须非空，从无歧义元素确定类型，所有元素必须兼容。有 `[T; N]` 上下文时必须提供 N 个元素；有 `[T]` 上下文时建立对产生数组的只读视图，服从借用生命周期。空 `[]` 需要 `[T; 0]` 或 `[T]` 上下文。

索引接受整数。编译期可知的负索引或越界索引产生诊断，动态越界终止。先求值接收者，再求值索引，各一次。修改元素要求接收者可写。数组仅在元素类型支持相等时支持相等。

## 枚举的两种形式

枚举至少包含一个 case。所有 case 均无载荷时，它是数值枚举；省略底层类型时使用 `i32`，显式底层类型必须为整数。

```carven
enum Status: u8 {
    Ready = 1,
    Busy,
    Done,
}
```

省略数值时从零开始，或对前一个值做检查过的加一。初始化值必须可表示，归一化后的数值不能重复。case 是常量，可显式转成整数；不能从整数转回枚举。

只要存在一个载荷 case，整个枚举就是载荷枚举。可混合无载荷 case，但不能声明底层整数、数值初始化或进行整数 cast，也没有默认值。

```carven
enum Reply {
    Empty,
    Number(i32),
    Pair(i32, bool),
}

fn reply(value: i32) -> Reply => .Number(value);

let empty: Reply = .Empty;
println(reply(3) == .Number(3), empty == .Empty); // true true
```

载荷 case 是一等构造函数，无载荷 case 是值。调用载荷 case 要满足精确参数个数；无载荷 case 不能加 `()`。

`.Case` 和 `.Case(...)` 必须从绑定、返回、赋值、实参、聚合位置或无歧义相邻操作数获得枚举类型。没有全局 case 名搜索，也不能单独导入 case。写全名 `Reply::Number(3)` 可明确指定 owner。

`reply` 的声明结果类型为 `.Number(value)` 提供 owner；带类型注解的绑定为 `.Empty` 提供 owner。

相等比较先比较 case；不同 case 不相等，相同 case 按载荷位置短路比较。所有载荷都支持相等时，载荷枚举才支持相等。

## 递归存储与可见性

结构体字段、枚举载荷和数组元素形成的按值存储图不能有环；长度为零的数组仍形成元素类型边。函数参数和结果不形成存储边，指针也不拥有目标，可用于递归结构。公开字段和载荷类型必须对声明的读者可见。类字段对类体私有，可以使用模块私有类型；类操作仍服从其声明的可见范围。
