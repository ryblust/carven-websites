---
title: 函数、结果推断与调用
description: 函数签名、表达式体、递归结果依赖、void 与调用顺序。
section: reference
lesson: 6
source: docs/language/functions.md
---

## 声明与调用

```carven
fn add(left: i32, right: i32) -> i32 {
    return left + right;
}

fn twice(value: i32) => value * 2;
```

普通命名函数的每个参数必须有类型。命名参数不可重名；`_` 不创建绑定，可以重复使用。实参个数、访问标记和类型必须匹配。函数不重载，没有默认参数、可变参数、嵌套函数或用户泛型参数列表。带体函数使用块体或 `=> expression;`。只做一件表达式工作的函数通常写表达式体；块体只通过显式 `return` 返回。

运行时调用先求值被调用对象，再从左到右对每个运行时实参求值一次。静态输入按[静态参数规则](#静态参数)另行执行。具体闭包选定要调用的闭包对象，可调用视图保存其目标描述；所有实参求值完成后，才调用目标并读取当前捕获。实参求值中的副作用可能改变随后通过别名读取的存储。

## 结果推断

有函数体时可省略结果注解。每个 return 操作数独立定型，结果必须一致；调用者的期望类型不影响被调用函数的结果推断，前一个 return 也不给后一个提供上下文。不能正常完成的 return 操作数不贡献结果类型。

没有 return 操作数时推断 void；裸 `return;` 也要求 void。值返回函数的每条正常路径必须 return。块末尾普通表达式不是函数隐式返回。

```carven
fn number(flag: bool) -> i64 {
    if flag {
        return 1;
    }

    return 2;
}
```

这里显式 `i64` 给两个字面量提供上下文。若需要 C++ 判定外部结果兼容性，应写结果类型；原生表达式各自的 Carven 类型身份不自动合并。

表达式体等价于返回该表达式，使用同样的求值、访问、生命周期和失败处理规则。省略结果类型时由表达式推断；表达式可以是值形式 `if`、`match`、`try`，写出结果类型时也可以是[上下文构造](/zh/reference/aggregates/#上下文构造)。void 表达式可作为表达式体，也可 `return action();`。可失败表达式须显式 `?`，例如 `return action()?;`。

## 递归与声明顺序

编译器先收集函数声明及其签名，因此函数可以引用写在后面的声明。需要结果推断的函数按依赖完成。结果推断环产生 `CV-TYPE-RESULT-INFERENCE-CYCLE`，用显式 `-> T` 打断；不能靠调用者上下文、运算符要求或常量分支猜测环内结果。

```carven
private fn even(value: i32) -> bool => if value == 0 { true } else { odd(value - 1) };

private fn odd(value: i32) -> bool => if value == 0 { false } else { even(value - 1) };
```

去掉两个 `-> bool` 注解后，两者的结果相互依赖，报告 `CV-TYPE-RESULT-INFERENCE-CYCLE`。

失败集合的递归推断独立于结果类型推断。显式结果类型不意味着显式失败集合，反之亦然。没有函数体的边界声明省略返回类型时默认为 void。

## 编译期能力

`const fn` 声明一个具名 Carven 函数可以在必需的常量上下文中执行：常量初始化器、数组长度、常量块和 `const test`。这些上下文只能调用 `const fn`；若 `double` 是普通 `fn`，`const eight = double(4);` 报告 `CV-CONST-ADMISSION`。`const fn` 在运行时仍是普通调用，声明本身不执行任何代码。

```carven
const fn double(value: i32) -> i32 => value * 2;

const fn quadruple(value: i32) -> i32 => double(double(value));

const sixteen = quadruple(4);
println(sixteen, quadruple(5)); // 16 20
```

每个 const fn 定义都检查执行器能力，即使从未调用。可达调用（包括具名 const fn 的局部绑定调用）必须选中已知 const fn。普通函数、原生操作和 callable 参数在定义处报告 `CV-CONST-ADMISSION`。无条件 return 之后仍做类型检查但不需要执行能力；已知条件不会删去普通分支分析。入口、import(cpp) 声明与类操作不能是 const fn。操作与预算见[常量执行](/zh/reference/constants/#const-fn)。

## 静态参数

具名函数参数可以用 `const name: T` 声明静态输入。调用保留普通实参语法与完整源码参数个数：`fn add(value: i32, const offset: i32) -> i32 => value + offset;` 写作 `add(value, 2)`。输入是不可变值，没有可取地址的源存储；const 不能与 Write 或 Take 组合。

字面量、显式常量、外围静态参数、这些值上的允许操作，以及 `const fn` 结果可以提供静态输入。普通运行时 let/var 绑定、参数与 for 索引不能，即使值已知。转发包装器必须重复 `const` 参数契约。在 const 块或 const test 中，所有局部值属于静态阶段，可以提供这类输入。

`const fn` 允许函数在编译时执行；`const` 参数固定一个编译时输入。普通函数也可以有静态参数，剩余函数体仍在运行时执行。两者同时声明，并不会将普通调用或它的运行时实参移到编译期。

特化时，静态实参表达式按源顺序求值并冻结；剩余运行时调用再按源顺序求值 callee 与运行时实参。`const fn` 被静态根调用时仍使用这两阶段。在 const 块或 const test 内，实参则一起按源顺序执行，再根据得到的静态值选择实例。

实例由源函数与带类型的静态值确定。相同输入可共享实例，但每个静态实参表达式仍保留自己的执行。生成的 C++ 签名只包含运行时参数。有静态参数的函数必须直接调用，不能跨 import(cpp)/export(cpp) 边界，也不能成为 callable 值。lambda 与 callable view 类型不接受 const 参数。

## 静态控制

运行时函数体中的普通 if、逻辑运算符和 for 保留运行时语义；操作数的值不选择分析或静态执行。普通控制内的每个静态初始化器和静态实参，都由包含它的实例要求。在 const 块或 const test 内，普通控制在编译时执行并选择要执行的语句，但每个源码分支仍接受类型和契约检查。

`const if` 为每个实例选择一个分支，链中所有条件（包括 else if）都必须是静态表达式。所有分支都接受名字、类型、失败契约、所有权与返回分析，同一函数的所有实例共享一个契约。只有选中的分支参与特化与生成；其他分支的局部初始化根和静态实参不会在特化时执行。

```carven
fn scale(value: i32, const divisor: i32) -> i32 {
    const if divisor == 0 {
        return 0;
    } else {
        const factor = 100 / divisor;
        return value * factor;
    }
}

fn sum(value: i32, const count: i32) -> i32 {
    var total = 0;
    const for index in 0..count {
        total += scale(value, index);
    }
    return total;
}

println(scale(2, 0), scale(2, 4), sum(2, 3)); // 0 50 300
```

`scale(2, 0)` 不会执行 `100 / divisor`。类型形成仍在特化前计算每个分支中的常量数组长度，而不执行其声明。这类计算不输出内容，未选中分支的计算失败也会报告，并且值必须不依赖未绑定的静态参数。函数体中的 const 块在外围静态环境中执行，见[常量块](/zh/reference/constants/#常量块)。

`const for` 展开端点为静态值的 Read 整数区间。每个索引是静态绑定，每次迭代有自己的作用域，外围变量仍共享。运行时函数体中，`const alias = index` 保留静态资格，`let alias = index` 不保留。break、continue、return 与失败传播沿用普通含义。反向或空区间不展开任何迭代。累计迭代、实例与嵌套数量有限制，超限产生诊断，不回退运行时。未选中分支、静态 break 后的迭代及静态退出后的源码仍被检查，但不参与特化。

## 入口的失败契约

没有 `throw` 子句的私有非入口函数和 lambda 会推断失败集合。顶层语句构成隐式入口，同样推断向外传播的失败；逸出的失败以 `EXIT_FAILURE` 结束进程，在 stderr 输出结构化失败报告。

```carven
struct Missing {}

fn find(key: str) -> i32 throw Missing {
    if key == "answer" {
        return 42;
    }
    throw Missing {};
}

println(find("answer")?);
println(find("other")?);
println("unreachable");
```

程序输出 `42` 后以失败状态退出。显式 `fn main()` 或公开函数若有向外失败，必须写 `throw` 子句；省略时报告 `CV-EFFECT-THROW-PUBLISHED`。完整规则见[失败契约](/zh/reference/failures/)。
