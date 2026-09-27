---
title: 函数、结果推断与调用
description: 函数签名、表达式体、递归结果依赖、void 与调用顺序。
section: reference
lesson: 6
source: docs/semantics.md
---

## 声明与调用

```carven
fn add(left: i32, right: i32) -> i32 {
    return left + right;
}

fn twice(value: i32) => value * 2;
```

普通命名函数的每个参数必须有类型。命名参数不可重名；`_` 不创建绑定，可以重复使用。实参个数、访问标记和类型必须匹配。函数不重载，没有默认参数、可变参数、嵌套函数或用户泛型参数列表。带体函数使用块体或 `=> expression;`。只做一件表达式工作的函数通常写表达式体；块体只通过显式 `return` 返回。

先求值被调用对象，再从左到右对每个实参求值一次。具体闭包选定要调用的闭包对象，可调用视图保存其目标描述；所有实参求值完成后，才调用目标并读取当前捕获。实参求值中的副作用可能改变随后通过别名读取的存储。

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

这里显式 i64 给两个字面量提供上下文。若需要 C++ 判定外部结果兼容性，应写结果类型；原生表达式各自的 Carven 类型身份不自动合并。

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

每个 `const fn` 定义都会检查执行器能力，即使从未被调用。可达的调用，包括经由具名 `const fn` 的局部绑定进行的调用，都必须选中已知的 `const fn`。调用普通 `fn`、原生 C++ 操作或 callable 参数，会在定义处报告 `CV-CONST-ADMISSION`。无条件 return 之后或被常量事实排除的代码仍做类型检查，但不需要执行能力。入口、`import(cpp)` 函数和类操作不能是 `const fn`。支持的操作集合与预算见[常量求值](/zh/reference/constants/#const-fn)。

## 入口的失败契约

没有 `throw` 子句的私有非入口函数和 lambda 会推断失败集合。顶层语句构成隐式入口，同样推断向外传播的失败；逸出的失败以 `EXIT_FAILURE` 结束进程，不自动输出。

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
