---
title: "把程序拆成模块"
description: 拆分源文件，理解显式批次、三种导入路径和可见性。
section: learn
lesson: 8
source: docs/semantics.md
---

## 拆成两个文件

继续在 Carven 仓库根目录保存 math.cv：

```carven
fn add(left: i32, right: i32) -> i32 => left + right;
```

保存 main.cv：

```carven
import math using add;

fn main() {
    println(add(20, 22));
}
```

把两个文件都传给编译器：

```sh
./xmakew run carven main.cv math.cv
```

输出 42。导入不搜索磁盘，编译批次必须已经包含 math.cv。输入顺序不控制函数是否能被引用。

## 路径决定模块名

src/model.cv 对应 src.model，src/main.cv 中 `.model` 从所在逻辑目录选择 src.model。无前缀 model 从当前 craft 域根选择。

crafts/json/parser.cv 属于 json craft，其他域可用 `json::parser` 选择。`std::utf.text` 指向官方 crafts.carven.std.utf.text，普通 `std.utf` 仍是当前域路径。

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

## 练习

把两个文件放到 src 下，将 main 的导入改成 `.math`，命令输入改为 src/main.cv 与 src/math.cv。把 add 改成 private，确认另一个模块不能再导入；恢复裸声明。
