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

普通命名函数的每个参数必须有类型。命名参数不可重名；`_` 不创建绑定，可以重复使用。实参个数、访问标记和类型必须匹配。函数不重载，没有默认参数、可变参数、嵌套函数或用户泛型参数列表。带体函数使用块体或 `=> expression;`。

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

表达式体等价于返回该表达式，使用同样的访问、生命周期和失败处理规则。void 表达式可作为表达式体，也可 `return action();`。可失败表达式须显式 `?`，例如 `return action()?;`。

## 递归与声明顺序

编译器先收集函数声明及其签名，因此函数可以引用写在后面的声明。需要结果推断的函数按依赖完成。结果推断环产生 `CV-TYPE-RESULT-INFERENCE-CYCLE`，用显式 `-> T` 打断；不能靠调用者上下文、运算符要求或常量分支猜测环内结果。

```carven
private fn even(value: i32) -> bool {
    if value == 0 {
        return true;
    }

    return odd(value - 1);
}

private fn odd(value: i32) -> bool {
    if value == 0 {
        return false;
    }

    return even(value - 1);
}
```

失败集合的递归推断独立于结果类型推断。显式结果类型不意味着显式失败集合，反之亦然。没有函数体的边界声明省略返回类型时默认为 void。
