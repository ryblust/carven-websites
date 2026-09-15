---
title: 组合操作，也组合失败
description: 保留每一种失败的类型与数据，让恢复缩小契约，让接口明确承诺。
section: failure-contracts
source: docs/semantics.md
---

## 业务组合起来，失败仍然清楚

库存不足需要知道还剩多少，配送失败需要知道目的地，数量错误需要知道哪个输入被拒绝。Carven 让这些失败以各自的结构体或枚举流过函数，组合后的接口仍能说明每一种可能性。

**组合一组操作，无需为每一层额外定义一个汇总错误类型。** 失败集合由语言组合，原有的类型身份与载荷保留到真正需要处理它们的位置。

## 把结果组合的配套工作交给语言

在 C++ 中，结果类型可以用一个错误类型参数表达失败，例如 C++23 的 std::expected；多种载荷可由 std::variant 汇总，传播与恢复可用分支或库组合器组织。跨层组合时，项目需要安排错误集合、载体转换以及相应的接口约定。

Carven 把这些工作纳入语义分析：组合保留名义类型，处理计算剩余集合，发布接口检查上界。生成的 C++ 负责保存活动载荷并执行传播，源码保持成功计算与业务恢复的形状。

## 成功路径自然表达，传播位置清楚可见

订单报价由商品金额与配送费用组成。下面节选中的 line_total 声明 QuantityError 与 OutOfStock，delivery_fee 声明 DeliveryError；它们均返回 i32。

```carven
private fn primary_quote(
    quantity: i32,
    available: i32,
    zone: i32,
) -> i32 {
    return (line_total(quantity, available) + delivery_fee(zone))?;
}
```

加法保留业务计算的形状，`?` 标出整个表达式的失败出口。编译器为这个私有函数推断三个失败类型。第一个操作失败时，第二个操作和加法都不会执行。

**传播标记可以放在组合表达式上。** 阅读者能看见失败出口，也能继续按从左到右的顺序理解成功路径。私有函数的推断覆盖前向调用、直接递归和相互递归。

## 处理一类问题，就减少一份上层责任

一个支持自提的报价接口，可以在配送失败时退回商品金额：

```carven
fn pickup_quote(
    quantity: i32,
    available: i32,
    zone: i32,
) -> i32 throw QuantityError + OutOfStock {
    return try {
        primary_quote(quantity, available, zone)?
    } catch {
        DeliveryError(_) => line_total(quantity, available)?,
    };
}
```

这段节选沿用前面的提供者与失败类型。catch 完整覆盖保护体中的 DeliveryError，接口向外只保留 QuantityError 和 OutOfStock。备用计算产生的失败也接受同一接口约束。

**恢复会改变调用者需要面对的契约。** 只处理某个枚举 case 或通过 guard 筛选一部分情况时，其余可能性仍被保留。编译器依据实际覆盖范围计算剩余集合。

## 内部可以推断，接口明确承诺

私有辅助函数与 lambda 随操作组合推断失败集合。面向模块读者的函数有向外失败时，显式声明允许的类型；实现接受这一上界的检查。调用者根据声明理解接口，无需阅读函数体。

声明允许的某种失败，即使当前实现没有产生它，也仍属于调用契约。实现可以在已声明范围内调整；扩大范围则是调用者需要重新处理的接口变化。

## 回调带着同一份契约进入程序

失败检查同样覆盖函数、闭包与非拥有 callable view。一个只可能产生 InvalidAmount 的校验函数，可以传给允许 InvalidAmount 与 LimitExceeded 的策略接口。

```carven
fn process(
    amount: i32,
    policy: fn(i32) -> i32 throw InvalidAmount + LimitExceeded,
) -> i32 throw InvalidAmount + LimitExceeded {
    return policy(amount)?;
}
```

这里的失败类型由策略模块提供。增加捕获了额度的策略闭包时，它可以保留输入错误，再引入带有实际金额和额度的 LimitExceeded。调用方仍按接口所声明的集合恢复。

**可插拔的行为，也有可检查的失败边界。** 适配检查参数、成功结果和失败集合，借用与捕获的存活要求继续生效。

## 生成具有具体类型的原生控制流

Carven 将失败契约实现为带有具体备选类型的 C++ 结果与显式控制流，无失败契约使用直接结果。失败传播使用这条生成路径，不依赖 C++ 异常展开来承载 Carven 失败。

成功路径、失败载荷、局部清理与求值顺序共同决定生成代码。失败保留已完成的副作用；业务恢复和回滚由程序定义。原生 C++ 异常继续由原生适配边界处理。
