---
title: 学习 Carven
description: 学习基础语法，通过库存和 JSON 输入练习，再构建 Carven 语言服务器。
section: learn
lesson: 0
source: docs/language/tutorial.md
---

## 从这里开始

只需会使用终端和编辑文本文件，就可以开始前几章，不必先掌握 C++。第一章会带你准备编译器、运行程序，并查看生成的 C++。也可以在 Playground 中运行其浏览器环境支持的独立示例。原生互操作和需要原生支持的网络功能使用本地工具链；后续输入例子会给出终端操作步骤。

## 学习路线

每个阶段先提出实际问题，再引入解决它的语言能力。沿着这条路线，从基础计算进入库存短练习和异步 JSON 账本，再构建 Carven 语言服务器。后面的练习会用到前面学过的内容：表示数据、安全修改、处理无效输入，再验证结果。

<ol class="learning-route">
<li><strong>基础程序</strong><p>运行程序、计算价格、控制执行流程，并组合相关数据。</p><p><a href="/zh/learn/first-program/">第一个程序</a> · <a href="/zh/learn/values/">变量与类型</a> · <a href="/zh/learn/control/">分支与循环</a> · <a href="/zh/learn/functions/">函数</a> · <a href="/zh/learn/aggregates/">数据结构</a></p></li>
<li><strong>数据与接口</strong><p>读取、修改、转移和借用数据，打印结果，组合模块，处理失败，并传递回调。</p><p><a href="/zh/learn/ownership/">访问与所有权</a> · <a href="/zh/learn/text/">文本</a> · <a href="/zh/learn/formatting/">格式化</a> · <a href="/zh/learn/modules/">模块</a> · <a href="/zh/learn/failures/">失败与恢复</a> · <a href="/zh/learn/closures/">闭包</a></p></li>
<li><strong>测试、编译期与异步</strong><p>验证行为、准备静态数据，再组合异步工作。练习等待结果，并在离开作用域前取消和收尾。</p><p><a href="/zh/learn/testing/">测试</a> · <a href="/zh/learn/constants/">编译期计算</a> · <a href="/zh/learn/async/">异步工作流</a></p></li>
<li><strong>原生集成</strong><p>调用 C++ 库并操作外部地址。</p><p><a href="/zh/learn/interop/">C++ 互操作</a> · <a href="/zh/learn/pointers/">地址与非空检查</a></p></li>
<li><strong>练习与项目</strong><p>先完成库存短练习，再处理 JSON 输入，最后用 JSON 和 Async 构建 Carven 语言服务器。工具与工作流一章介绍项目中需要的运行、格式化与排错方法。</p><p><a href="/zh/learn/project/">练习：库存批处理</a> · <a href="/zh/learn/data-pipeline/">项目：JSON 输入</a> · <a href="/zh/learn/workflow/">运行、格式化与排错</a> · <a href="/zh/learn/lsp/">项目：语言服务器</a></p></li>
</ol>

## 查阅规则与设计

要查语法、API 及其规则，使用[语言参考](/zh/reference/)；要理解语言与实现如何配合，阅读[设计与原理](/zh/design/)。
