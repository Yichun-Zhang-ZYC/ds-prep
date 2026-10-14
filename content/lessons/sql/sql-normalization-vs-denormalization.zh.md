---
id: sql-normalization-vs-denormalization
title: 范式化与反范式化
---

## 为什么重要
“这份数据你会范式化存储还是反范式化存储？”考查的是你是否理解写入正确性和读取速度之间的权衡。它会出现在数据建模、分析工程和系统设计面试中。

## 概念
**范式化**消除冗余，让每个事实只存一次：

| 范式 | 规则（通俗说法） | 违反的例子 |
|---|---|---|
| 1NF | 每列只存一个原子值，没有重复组 | 一列里存 `tags = 'sql,python'` |
| 2NF | 满足 1NF，且每个非键列都依赖于**整个**复合键 | `order_items(order_id, product_id, product_name)`：商品名只依赖 product_id |
| 3NF | 满足 2NF，且非键列不依赖于其他非键列 | `employees(id, dept_id, dept_name)`：部门名依赖于 dept_id |

**反范式化**有意地复制数据（例如把 `customer_country` 复制到每一笔订单上），以避免读取时做连接。

| | 范式化（OLTP） | 反范式化（OLAP / 分析） |
|---|---|---|
| 写入 | 只改一处，没有异常 | 更新要改很多行 |
| 读取 | 需要很多连接 | 连接少，扫描快 |
| 典型场景 | 应用数据库 | 数仓、星型模型、宽表 |

## 示例讲解
一个满足 3NF 的修改：把部门属性移到单独的表中。

```sql
-- Before: dept_name repeated on every employee, can drift out of sync
CREATE TABLE employees (id INT, name TEXT, dept_id INT, dept_name TEXT);

-- After (3NF)
CREATE TABLE departments (dept_id INT PRIMARY KEY, dept_name TEXT);
CREATE TABLE employees   (id INT PRIMARY KEY, name TEXT, dept_id INT REFERENCES departments(dept_id));
```

现在重命名一个部门只需更新一行而不是几百行，部门名也不会出现不一致。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`orders(order_id, customer_id, customer_email, amount)` 违反了哪个范式？为什么？",
  "options": ["1NF，因为 email 是文本", "3NF，因为 customer_email 依赖于 customer_id，而不是 order_id", "2NF，因为键是复合键", "没有违反"],
  "explanation": "customer_email 是关于客户的事实（通过 customer_id 产生的传递依赖）。应该把它移到 customers 表中。"
}
```

```reveal
{
  "prompt": "既然范式化能避免异常，为什么分析型数仓通常是反范式化的（星型模型、宽表）？",
  "answer": "数仓读多写少，而且基本只追加：数据由管道批量加载，而不是由用户逐行修改，所以更新异常的影响小得多。同时，分析师要做大规模扫描和聚合，每多一次连接就多花时间和金钱。列式存储对重复值的压缩效果也很好，冗余的代价很低。星型模型是常见的折中：窄的事实表，周围是反范式化的维度表。"
}
```

> [!TIP] 面试技巧
> - 把答案框定为一种权衡：写入完整性 vs 读取性能。
> - 说出负载类型：OLTP → 范式化；OLAP → 反范式化（星型模型）。
> - 提一下“唯一可信源”保持范式化，反范式化的表由管道从它重新构建。
