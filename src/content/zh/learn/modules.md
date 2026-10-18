---
title: "把程序拆成模块"
description: "在文件间共享函数与类型，选择导入名字，并控制哪些声明对外可见。"
section: learn
lesson: 9
source: docs/language/modules.md
---

## 拆成两个文件

继续在 Carven 仓库根目录保存 math.cv：

```carven
fn add(left: i32, right: i32) -> i32 => left + right;
```

保存 main.cv：

```carven
import math using add;

println(add(20, 22));
```

把两个文件都传给编译器：

```sh
./xmakew run carven main.cv math.cv
```

输出 42。导入不搜索磁盘，编译批次必须已经包含 math.cv；只传 main.cv 会报告 `CV-IMPORT-RESOLUTION`。输入顺序不控制函数是否能被引用。

文件名去掉 .cv 后成为模块名的一部分，只能由字母、数字和下划线组成，且不能以数字开头。`my-math.cv` 会被拒绝，改用 `my_math.cv`。

想查看生成的 C++，运行：

```sh
./xmakew run carven compile --stdout main.cv math.cv
```

输出显示 main.cv 与 math.cv 的生成文件。将产物写入目录或用于 C++ 构建的方法见[工具链参考](/zh/reference/toolchain/)。

## 路径决定模块名

Craft 是一个有名称的源码包。应用文件共享一个模块范围，每个 Craft 也有自己的模块范围；包内的本地导入只在本包的范围内解析。

src/model.cv 对应 src.model，src/main.cv 中 `.model` 从所在逻辑目录选择 src.model。无前缀 model 从当前 Craft 的模块根路径解析。

crafts/json/parser.cv 属于 json Craft，其他模块范围可用 `json::parser` 选择。`std::utf` 指向官方 crafts.carven.std.utf，普通 `std.utf` 仍是当前模块范围内的路径。

工具链与项目 Crafts 怎样加入编译批次，见[模块参考](/zh/reference/modules/)。

## 显式选择多个名字

在 math.cv 末尾添加一个函数：

```carven
fn subtract(left: i32, right: i32) -> i32 => left - right;
```

将 main.cv 替换为同时导入两个函数的程序：

```carven
import math using { add, subtract };

println(add(20, 22), subtract(20, 4));
```

运行 `./xmakew run carven main.cv math.cv`，输出 `42 16`。

用 `carven-format` 排版导入列表；[工作流章节](/zh/learn/workflow/)介绍具体命令。

## 控制声明的可见范围

private 声明只在本模块可见；不带可见性修饰符的声明在同一 Craft 内可见；export 声明对当前批次的所有模块范围可见。普通应用文件共享一个模块范围，所以例子中没有可见性修饰符的 add 可以被 main 导入。

要从独立的 Craft 公开函数，创建 crafts/pricing 目录，并保存 crafts/pricing/quote.cv：

```carven
private fn delivery(quantity: i32) -> i32 => if quantity >= 10 { 0 } else { 8 };

export fn total(price: i32, quantity: i32) -> i32 => price * quantity + delivery(quantity);
```

替换仓库根目录的 main.cv：

```carven
import pricing::quote using total;

println(total(12, 3));
```

把这些文件传给编译器：

```sh
./xmakew run carven main.cv crafts/pricing/quote.cv
```

输出 44。`total` 从 pricing Craft 导出，内部可以调用同一模块的私有辅助函数 `delivery`，main.cv 则不能导入该辅助函数。去掉 `total` 的 `export` 后，它只在 pricing 内可见，main.cv 的导入会被拒绝。

公开接口使用的类型必须对调用者可见。导出类型和函数时的完整规则见[模块可见性参考](/zh/reference/modules/)。

## 项目构建

文件增多后由 Xmake 收集批次和原生依赖。在使用 Carven 的项目的 xmake.lua 中：

```text
add_repositories("carven-xmake-repo https://github.com/ryblust/carven-xmake-repo.git")
add_requires("carven")
target("app")
    set_kind("binary")
    add_rules("@carven/carven")
    add_files("src/**.cv")
```

规则获取版本匹配的编译器与 Crafts，在 C++ 依赖扫描之前完成生成。原生 include 路径和库是构建输入，不由 Carven import 自动添加。

## 导入能力并选择本地名字

标准模块使用 std:: 前缀。可以保留所选名字，也可以用 as 为它取本地别名：

```carven run
import std::core using String as Text;
import std::io using println as write_line;

let names: Vector<Text> = ["north", "south", "west"];
write_line(names.length(), names[1]);
```

输出 `3 south`。Text 与 String 表示同一种类型，write_line 与 println 调用同一个打印函数。导入名字冲突，或换个本地名字更易读时，可以使用别名；它不会改变类型或函数的行为。

导入函数只引入函数名；若还要在源码里写出非默认的结果或失败类型，也要另外导入那个类型。

导入父路径不会顺带导入所有子模块。API 所属的模块可在[标准 API 索引](/zh/reference/library/)中查找。

## 使用默认名字并导入其他名字

`String` 属于 `std::core`，默认可用。同属该模块的 `NumberParseError` 则需要显式导入后才能命名。默认绑定只提供选定的名字，不会引入模块的全部声明。

[模块参考](/zh/reference/modules/#标准模块与默认名字)列出各 API 所属的模块、默认可用的名字，以及行为由编译器还是源码定义。

## 练习

回到最初的 main.cv 与 math.cv。把它们放到 src 下，将 main 的导入改成 `.math`，运行 `./xmakew run carven src/main.cv src/math.cv`。把 add 改成 private，确认另一个模块不能再导入；恢复裸声明。
