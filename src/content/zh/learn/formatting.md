---
title: "格式化与打印结果"
description: 组织可读输出，使用插值、格式说明和原地追加。
section: learn
lesson: 7
source: docs/semantics.md
---

## 直接打印值

```carven
fn main() {
    println("quantity", 3, true);
    println();
    eprintln("status", "ready");
}
```

println 在相邻实参间加空格，并追加换行；eprintln 写 stderr。print/eprint 不自动加换行。文本不是格式串，`println("{count}", 3)` 会原样打印花括号。

## 用插值控制格式

```carven
fn main() {
    let id = 42;
    let amount = 12.5;
    let message = f"Order {id:04}: {amount:.2f}";
    println(message);
}
```

输出 `Order 0042: 12.50`。插值结果是独立 String。`{...}` 中的部分称为插值字段，可以在其中写普通计算。`:04` 是宽度和零填充，`:.2f` 将浮点数保留两位小数。花括号本身写 `{{` 和 `}}`。

## 在已有 String 追加

```carven
fn main() {
    var report = String::new();

    for index in 0..3 {
        report.append_format(f"[{index}]");
    }

    println(report);
}
```

输出 `[0][1][2]`。append_format 直接接收 f 字面量，可以避免创建中间的源级 String。把已有 String 变量传给它不符合该方法语法；普通文本追加使用 append。

## 顺序会影响观察

插值字段从左到右各求值一次，然后开始格式化。标量字段保存求值时的值；String 字段按 Read 访问保留原存储，等所有字段求值完成后才读取其中的内容进行格式化。需要在多个字段中修改同一个对象时，用单独的语句写清副本的创建和修改顺序。

append_format 的输入不能借用追加目标自身。长度查询返回独立 usize，因此 `report.append_format(f"{report.len()}")` 可以使用；`report.append_format(f"{report}")` 形成目标别名冲突。

## 练习

把报告每个整数改成两位十六进制，例如 `[00][01][02]`。用 println 打印同一段含 NUL 文本，注意终端可能不显示 NUL，但它仍属于文本内容与长度。
