---
title: 类型化失败契约
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

显式 throw 是函数体失败集合上界。省略时，私有非入口函数、隐式入口及 lambda 在前向调用和递归图上推断最小不动点集合；有非空失败的裸/导出公开函数须写契约，否则 CV-EFFECT-THROW-PUBLISHED。显式入口无论可见性如何都须为向外失败写契约。测试必须处理所有失败。公开失败类型须对该受众可见。

可复制能力要求适用于可调用值子句、Operation 成员、throw 载荷与 typed catch；在完整名义字段后递归检查。拥有 Operation 的名义值不能作失败载荷，Move 进 throw 不消除可复制能力要求；原生字段遵循委托 C++ 的复制边界。

调用使用被调用函数契约：`fn source() throw Error {}` 即使体不失败，调用仍携带 Error。不可变局部中已知函数目标经过复制及 view 适配保留目标契约；更宽 view 不给该已知调用凭空添加失败。参数、可变 view 或未解目标使用 view 的契约。

## 失败集合参数

`throw E` 是有限声明的失败类型集合参数，可为空，不是载荷类型或值参数。

```carven
import std::async using Operation;
async fn consume<T, throw E>(&&operation: Operation<T, throw E>) -> T throw E {
    return (await operation)?;
}
```

显式应用可传 `throw Error + IO` 或 `throw ()`。E 可进入函数 throw 或 Operation，单独或与具体成员联合；实参展开后去重。函数从公开签名、实参及直接期望结果推断；完整 `Operation<T, throw E>` 可提供 E，歧义联合 E + Error 不能唯一恢复 E 时须显式实参。名义类型应用总要求显式实参。

定义须对每个允许的集合安全，不能假设 E 含特定类型、非空或与另一参数相等。未标记待处理失败须可证明为空，传播须可证明在外围契约内；安全具体调用不能挽救不安全定义。

typed catch 仍命名名义类型，不能构造/throw/select E 作为载荷。完整处理 Error 从受保护集合（包括依赖 E 的集合）移除 Error，剩余保留参数依赖。若定义处失败集合可能非空，? 合法，即使具体实例为空仍求值一次但无失败传递；这不允许定义检查时已证明无失败的多余 ?。

## `?` 与 `throw`

有待处理失败的表达式不能在需要完成值的位置消费。后缀 ? 在该词法位置消费 operand 的失败并转到最近失败目标，operand 可为调用或携带失败的复合表达式。具体失败集合解出为空时 ? 非法。throw 转移载荷，不正常完成。

```carven
struct Missing { key: String }
fn lookup(key: str) -> i32 throw Missing {
    if key == "answer" { return 42; }
    throw Missing { key: key as String };
}
let answer = try { lookup("other")? } catch { Missing(_) => 0, };
println(answer); // 0
```

`(first() + second())?` 若 first 失败，跳过 second 与加法。所有实参/操作数按选中路径从左到右求值一次。失败不回滚已完成修改或外部效果。Carven 失败与 C++ 异常独立，原生异常须在越过生成 noexcept 边界前于 C++ 内处理。

<span id="部分捕获与剩余集合"></span>

## 部分 catch 与剩余集合

try 处理受保护体产生的失败，可用类型、通配、或模式、载荷模式和 守卫条件。未处理成员转到外围失败目标；外围 protected body、可推断私有非入口函数/隐式入口/lambda 或显式 throw 契约可接受。测试及无显式契约的公开/显式入口边界必须全覆盖。

```carven
struct A {}
struct B {}
fn source() throw A + B {}
fn wrapper() throw B {
    try { source()?; } catch { A(_) => {}, }
}
```

此处处理 A，转发 B；加 `_ => rethrow,` 得同样向外集合。只有所有值被完整覆盖才移除该类型；守卫条件 可能拒绝不构成完整覆盖。

守卫条件 或 handler 产生的失败转到外围，不能由同一个 try 再捕获。某 arm 的第一个匹配 alternative 建立绑定后只执行一次 守卫条件，false 从下一 arm 继续。成员集合无序不影响可观察的 arm 顺序。部分载荷与拒绝守卫条件会进入非穷尽诊断；错误列出未处理类型及最近传播它们的 ?。try 包无失败体合法。

## 已知函数目标

不可变已知函数目标保留其精确失败契约，包括显式上界。可变或未解目标按 view 契约检查，不从单次运行猜测实际失败。

## 选择顺序与 守卫条件

失败原始载荷保留到 arm 选择、守卫条件 与 rethrow 完成。绑定和模式继承普通访问、主体稳定性及穷尽规则；见[控制流](/zh/reference/control/)。不可匹配的 catch arm 或 alternative 产生对应警告。

## rethrow 与寿命

rethrow 仅可在 catch handler 内使用，转移当前 handler 选中的原始失败身份。闭包是独立可调用值边界，创建闭包不执行其失败或控制转移。失败载荷与 catch 复制遵循普通 所有者/借用规则；原始载荷独立于 catch 复制保留 后备存储，Take catch所有者不消费 rethrow 的原始值。传播与清理不能销毁仍被载荷借用的存储。
