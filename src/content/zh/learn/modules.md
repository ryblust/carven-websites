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

输出只列出属于显式输入的产物，标题依次是 `carven/generated/math.hpp`、`main.cpp` 和 `math.cpp`。自动收集的 Crafts（例如标准库的 `std::utf` 与 `std::simd` 模块）仍参与分析，但不会显示；所显示文件的依赖只以 include 的形式出现。换成 `compile -o generated` 写入目录时，也会在 `generated/crafts/carven/std/` 下输出收集的标准库；手工 C++ 构建还须编译生成的实现与所需原生 provider。

## 路径决定模块名

craft 是一个命名源码包。应用文件共享一个模块范围，每个 craft 也有自己的范围，因此包内的本地导入不会意外选择另一个包里的文件。

src/model.cv 对应 src.model，src/main.cv 中 `.model` 从所在逻辑目录选择 src.model。无前缀 model 从当前 craft 域根选择。

crafts/json/parser.cv 属于 json craft，其他域可用 `json::parser` 选择。`std::utf` 指向官方 crafts.carven.std.utf，普通 `std.utf` 仍是当前域路径。

`check`、`compile`、原生运行和 `interpret` 都把显式应用文件与工具链、项目的固定 Crafts 目录组成批次。这发生在导入解析之前，并不让 import 搜索文件系统。

## 显式选择多个名字

从一个模块导入多个名字时使用列表。例如，模块提供 Point 和 length 时：

```carven
import geometry.vector using { Point, length };
```

单行列表在花括号内留空格，不加尾逗号；较长列表由格式化工具展开为每行一个名字并添加尾逗号。这里的排版不改变导入含义，模块仍须包含在编译批次中。

## 控制声明的可见范围

private 只给本模块，裸声明给同一 craft 域，export 给当前批次所有域。普通应用文件都在无前缀域，所以例子中裸 add 可以被 main 导入。

公开接口不能暴露读者不可见的类型，包括参数、结果、失败类型、结构体字段、枚举载荷和嵌套 callable。把私有结构体放进 export 返回类型会被拒绝。

## 项目构建

文件增多后由 Xmake 收集批次和原生依赖。在消费项目的 xmake.lua 中：

```text
add_repositories("carven-xmake-repo https://github.com/ryblust/carven-xmake-repo.git")
add_requires("carven")
target("app")
    set_kind("binary")
    add_rules("@carven/carven")
    add_files("src/**.cv")
```

规则获取匹配 compiler 与 Crafts，在 C++ 依赖扫描之前完成生成。原生 include 路径和库是构建输入，不由 Carven import 自动添加。

## 导入能力并选择本地名字

标准模块使用 std:: 前缀。可以保留所选名字，也可以用 as 为它取本地别名：

```carven
import std::core using String as Text;
import std::io using println as write_line;

let names: Vector<Text> = ["north", "south", "west"];
write_line(names.length(), names[1]);
```

输出 `3 south`。Text 与 String 表示同一种类型，write_line 与 println 调用同一个打印函数。导入名字冲突，或换个本地名字更易读时，可以使用别名；它不会改变类型或函数的行为。

String、Vector、Range、println 等常用名字无需导入即可使用。其他能力需要显式选择。导入函数只引入函数名；若还要在源码里写出它返回或报告的某种类型，也要另外导入那个类型。

std::utf、std::json 这样的公共入口各自提供一个模块的 API。导入父路径不会顺带导入所有子模块，例如 std::simd.bytes 就是独立模块。

## 练习

把两个文件放到 src 下，将 main 的导入改成 `.math`，命令输入改为 src/main.cv 与 src/math.cv。把 add 改成 private，确认另一个模块不能再导入；恢复裸声明。
