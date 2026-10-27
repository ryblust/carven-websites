---
title: "集合、映射与字节摘要"
description: "保存键值、查询哈希容器并计算增量字节摘要。"
section: reference
lesson: 32
source: docs/language/collections.md
---

`std::collections` 提供 `HashMap<K, V>` 和 `HashSet<T>`。键要求默认可见的内建 `Hash` 与 `Equal` 能力。容器操作均为 `const fn`，静态、解释和原生执行使用同一份 Carven 实现。存储类型遵循普通拥有型存储规则。

## 映射

```carven
import std::collections using HashMap;

var counts = HashMap<String, usize>::new();
let key: String = "main.cv";
counts.insert(&&key, &&1);
let query: String = "main.cv";
let count = counts.find(query);
if count != nullptr => assert(*count == 1);
```

`new()` 创建空映射；`with_capacity(capacity)` 为预期条目数保留空间。`length()` 返回条目数，`is_empty()` 判断是否为空。

`insert(&&key: K, &&value: V) -> bool` 接收键和值的所有权。新键返回 `true`。已有相等键时返回 `false`，保留原键值，新传入的参数正常销毁。

`find(key: K) -> ptr<V>` 返回指向已存值的只读指针，缺失时为 `nullptr`。`contains(key: K) -> bool` 判断键是否存在。查询按 Read 访问，不复制拥有型键；查询类型必须为映射的键类型，不提供异构键查询。

`find_mut(key: K) -> ptr<&V>` 对映射使用 Write 访问，返回可写指针或 `nullptr`，查询键仍按 Read 访问。

`entries() -> [MapEntry<K, V>]` 返回只读借用切片，条目含 `key`、`value` 字段。切片按普通借用规则保护映射存储；`find` 和 `find_mut` 返回的原始指针不保留借用。使用指针时，条目必须仍在原地址存活；插入、删除或 `clear` 都可能使其失效。

`remove(key: K) -> Lookup<V>` 用 `.Found(value)` 转移取出的值，未找到则为 `.Missing`。`clear()` 销毁全部条目。空构造、插入、查找和移除不要求 `K` 或 `V` 可默认初始化或复制。存储类型可复制时，映射本身也可复制。

## 集合

`HashSet<T>` 保存互不相等的拥有型键，提供 `new()`、`with_capacity(capacity)`、`length()`、`is_empty()`、`contains(key: T)` 和 `clear()`。

`insert(&&key: T) -> bool` 接收所有权，返回是否加入新键；已有相等键保持不变。`remove(key: T) -> Lookup<T>` 转移取出的键。`values() -> [T]` 返回只读借用切片。

## 哈希与存储

相等键必须有相同哈希，不同键可以碰撞，容器会继续检查相等性。键存入后只读；需要修改时先移除再插入。

条目连续存储并通过哈希索引，查找和插入期望为常数成本，增长时可能执行线性工作。移除保留其余条目的顺序，成本与条目数及桶容量成线性关系。切片按首次插入顺序暴露条目，重复插入保留原位置。

`hash_bytes(bytes: [u8]) -> u64` 哈希字节序列，`hash_text(text: str) -> u64` 哈希 UTF-8 字节，均不观察宿主环境。哈希用于内存查找，不定义持久产物标识。

## 增量字节摘要

`ByteDigest::new()` 创建确定性的 128 位字节摘要。`update(bytes: [u8])` 按顺序添加字节，分块更新与拼接后一次更新相同；空更新不改变状态。`value() -> (u64, u64)` 返回快照，之后仍可继续更新。复制摘要得到独立状态。

```carven
import std::collections using ByteDigest;

var digest = ByteDigest::new();
digest.update("hello".bytes);
digest.update(", world".bytes);
let fingerprint = digest.value();
```

这些方法为 `const fn`，摘要状态和完成值都可保留为常量。摘要用于内容变化检测，不用于密码学认证；算法不承诺跨工具链版本保持持久格式。多个值的边界有意义时，由调用方编码边界。
