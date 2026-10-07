---
title: 学习 Carven
description: 从第一个可运行的程序开始，逐步完成一个有验证、失败恢复与测试的订单项目。
section: learn
lesson: 0
source: docs/language/tutorial.md
---

## 从这里开始

只需会使用终端和编辑文本文件，就可以开始前几章，不必先掌握 C++。第一章会带你准备编译器、运行程序，并查看生成的 C++。也可以先打开 Playground，直接尝试网站中的示例。

## 学习路线

每个阶段先提出实际问题，再引入解决它的语言能力。沿着这条路线，你会逐步写出“失败时不扣库存”的订单程序。

<ol class="learning-route">
<li><strong>写出基本逻辑</strong><p>计算价格、表示库存，学会组织一个小程序。</p><p><a href="/zh/learn/values/">值</a> · <a href="/zh/learn/control/">控制流</a> · <a href="/zh/learn/functions/">函数</a> · <a href="/zh/learn/aggregates/">数据结构</a></p></li>
<li><strong>管理数据与接口</strong><p>区分读取、修改、转移和借用，组合模块、失败契约与回调。</p><p><a href="/zh/learn/ownership/">访问与所有权</a> · <a href="/zh/learn/text/">文本</a> · <a href="/zh/learn/formatting/">格式化</a> · <a href="/zh/learn/modules/">模块</a> · <a href="/zh/learn/failures/">失败契约</a> · <a href="/zh/learn/closures/">闭包</a></p></li>
<li><strong>验证与提前计算</strong><p>通过测试确认行为，在程序运行前构造静态数据。</p><p><a href="/zh/learn/testing/">测试</a> · <a href="/zh/learn/constants/">编译期计算</a></p></li>
<li><strong>完成订单项目</strong><p>把输入验证、库存更新、失败恢复和测试组合成一个完整程序。</p><p><a href="/zh/learn/project/">实践：库存更新</a></p></li>
</ol>

## 拓展与查阅

需要调用原生库时，再学习 [C++ 接入](/zh/learn/interop/)与[指针](/zh/learn/pointers/)。这些章节会介绍头文件、依赖和外部存储的要求；如果当前只关注 Carven 代码，可以在编译期计算之后直接完成订单项目。

想查运行命令、格式化或错误定位，读[运行、格式化与排错](/zh/learn/workflow/)；想核对某种写法的规则，查[语言参考](/zh/reference/)；想理解语言为什么这样设计，读[设计与原理](/zh/design/)。
