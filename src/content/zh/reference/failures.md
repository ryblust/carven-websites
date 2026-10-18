---
title: "失败契约"
description: 失败集合、显式上界、推断、传播目标、部分捕获、守卫条件和重抛。
section: reference
lesson: 7
source: docs/language/failures.md
---

## 失败类型与接口

函数除了返回正常结果，也可以报告无效输入等可恢复失败。throw 子句列出调用者需要处理的失败类型；调用者用 ? 向外传播，或用 try/catch 恢复。每个失败携带一个结构体或枚举值，用来说明失败原因；这个值必须可复制，不能直接把整数或字符串当作失败类型。具体契约是闭合类型集合，成员书写与声明顺序无关，同一子句不能重复成员。`throw ()` 显式声明空集，与省略子句请求推断不同；这里 () 没有载荷，在普通值/类型位置它仍为 void 单元值。`throw void` 非法。

```carven
fn finish() -> void throw () => ();
```

显式 throw 是函数体失败集合上界。省略时，私有非入口函数、隐式入口及 lambda 在前向调用和递归图上推断最小不动点（least fixed point），得到完整的失败集合；可能向外传播失败的未标注可见性或 export 函数必须写出契约，否则 CV-EFFECT-THROW-PUBLISHED。显式入口无论可见性如何都须为向外失败写契约。测试必须处理所有失败。公开失败类型须对函数的使用者可见。

可复制能力要求适用于可调用值子句、Operation 成员、throw 载荷与 typed catch；在完整名义字段后递归检查。包含 Operation 所有者的名义类型值不能作为失败载荷，将值转移给 throw 也不能免除可复制要求；原生字段遵循委托 C++ 的复制边界。

调用使用被调用函数契约：`fn source() throw Error {}` 即使体不失败，调用仍携带 Error。已知函数适配为可调用视图时，遵循[已知函数目标规则](/zh/reference/closures/#已知函数目标)。

## 失败集合参数

`throw E` 是表示有限失败类型集合的参数，可为空，不是载荷类型或值参数。

```carven
import std::async using Operation;

async fn consume<T, throw E>(&&operation: Operation<T, throw E>) -> T throw E {
    return (await operation)?;
}
```

显式应用可传 `throw Error + IO` 或 `throw ()`。E 可进入函数 throw 或 Operation，单独或与具体成员联合；实参展开后去重。函数从公开签名、实参及调用位置的期望结果类型推断；完整 `Operation<T, throw E>` 可提供 E，歧义联合 E + Error 不能唯一恢复 E 时须显式实参。名义类型应用总要求显式实参。

定义必须对所有允许的失败集合都成立，不能假设 E 含特定类型、非空或与另一参数相等。未标记待处理失败须可证明为空，传播须可证明在外围契约内；即使具体调用没有问题，也不能使不符合这些要求的定义通过检查。

按类型捕获时仍须写出名义类型，不能把 E 当作某个具体载荷来构造、抛出或匹配。完整处理 Error 从受保护集合（包括依赖 E 的集合）移除 Error，剩余保留参数依赖。若定义处失败集合可能非空，? 合法，即使具体实例为空仍求值一次但无失败传递；这不允许定义检查时已证明无失败的多余 ?。

## `?` 与 `throw`

表达式存在待处理失败时，不能直接在需要成功结果的位置使用它。后缀 ? 处理其操作数可能产生的失败，并将失败传播到当前作用域最近的失败处理目标；操作数可以是调用，也可以是可能失败的复合表达式。具体失败集合确定为空时，不能使用 ?。throw 转移失败载荷，不会正常返回。

```carven run
struct Missing { key: String }

fn lookup(key: str) -> i32 throw Missing {
    if key == "answer" {
        return 42;
    }
    throw Missing { key: key as String };
}

let answer = try {
    lookup("other")?
} catch {
    Missing(_) => 0,
};
println(answer); // 0
```

`(first() + second())?` 若 first 失败，跳过 second 与加法。所有实参/操作数按选中路径从左到右求值一次。失败不回滚已完成修改或外部效果。Carven 失败与 C++ 异常独立，原生异常须在越过生成 noexcept 边界前于 C++ 内处理。

<span id="部分捕获与剩余集合"></span>

## 部分 catch 与剩余集合

`try` 处理受保护体产生的失败，可用类型、通配、或模式、载荷模式和守卫条件。未处理成员转到外围失败目标；外围 try 保护的代码块、允许推断失败集合的私有非入口函数、隐式入口或 lambda 或显式 throw 契约可接受。测试及无显式契约的公开/显式入口边界必须全覆盖。

```carven
struct A {}
struct B {}
fn source(select_a: bool) throw A + B {
    if select_a {
        throw A {};
    }
    throw B {};
}

fn wrapper(select_a: bool) throw B {
    try {
        source(select_a)?;
    } catch {
        A(_) => {},
    }
}
```

此处处理 A，继续传播 B；加 `_ => rethrow,` 得同样向外集合。只有所有值被完整覆盖才移除该类型；守卫条件可能拒绝不构成完整覆盖。

守卫条件或处理分支产生的失败转到外围，不能由同一个 try 再捕获。每个分支中，第一个匹配的备选模式建立绑定后，只执行一次守卫条件；条件为 false 时继续下一个分支。失败集合没有顺序，但 catch 分支仍按源码顺序匹配。仅匹配部分载荷或可能不通过的守卫条件，不能证明已完整处理该失败类型，可能产生非穷尽诊断；错误列出未处理类型及最近传播它们的 ?。try 的代码块即使不会失败，也可以使用 try。

## 载荷选择与守卫条件

原始失败载荷会保留到分支选择、守卫条件与 rethrow 完成。绑定和模式继承普通访问、主体稳定性及穷尽规则；见[控制流](/zh/reference/control/)。无法匹配的 catch 分支或备选模式 产生对应警告。

## rethrow 与生命周期

rethrow 只能在 catch 处理分支内使用，继续传播该分支选中的原始失败。闭包是独立可调用值边界，创建闭包不执行其失败或控制转移。原始载荷在分支选择、守卫条件与 rethrow 期间保留其借用关系；只要失败载荷仍引用底层存储，传播与清理就不能销毁该存储。

catch 模式绑定不是所有者，不能直接 Take。需要转移选中的载荷时，先用 `let owned = error;` 将其复制到局部所有者，再使用 `&&owned`。转移这份副本不会取走 `rethrow` 保留的原始失败。
