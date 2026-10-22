---
id: swe-caching
title: 缓存（Redis）
---

## 为什么重要
缓存是降低延迟和数据库负载最便宜的办法，当你说“这个接口很慢”时，面试官首先想到的就是它。会被问到 cache-aside、失效、淘汰和缓存击穿，在机器学习服务中还会问到如何缓存特征和预测结果。

## 概念
**缓存**把昂贵计算的结果（数据库查询、特征查找、模型预测）存放在高速内存中，使重复请求可以跳过这些工作。**Redis** 是内存中的键值存储，支持 TTL、原子操作和丰富的数据类型（string、hash、set、sorted set）。典型读取延迟在亚毫秒级，而数据库为几十毫秒。

**Cache-aside（旁路缓存/懒加载）**是默认模式：应用先查缓存，未命中时读取权威数据源，然后写入缓存。

```python
import json

def get_user(uid, r, db, ttl=300):
    key = f"user:{uid}"
    cached = r.get(key)
    if cached is not None:
        return json.loads(cached)
    user = db.fetch_user(uid)          # source of truth
    r.set(key, json.dumps(user), ex=ttl)
    return user
```

**其他写入策略**：
- **Write-through（写穿）**：同时写缓存和数据库。读取总是最新的，写入较慢。
- **Write-back（写回/write-behind）**：先写缓存，异步刷入数据库。写入快，但有丢数据风险。
- **Read-through（读穿）**：缓存层自己在未命中时从数据库加载。

**失效**是最难的部分。选择：**TTL**（简单，陈旧程度有界）、写入时**显式删除**（`DEL user:42`），或带版本的键（`user:42:v7`）。写入时优先删除而不是原地更新，避免并发写入者互相竞争。

内存满时的**淘汰**：**LRU**（最近最少使用）是常见默认值，LFU 偏向高频使用的键，`allkeys-lru` 或 `volatile-ttl` 是 Redis 的 `maxmemory-policy` 配置。

**故障模式**：
- **缓存击穿/惊群（stampede）**：热点键过期，成千上万个请求同时打到数据库。解决：请求合并或加锁、TTL 加抖动、提前刷新。
- **缓存穿透**：请求不存在的键，永远未命中。短时间缓存空结果，或使用 Bloom filter。
- **陈旧与不一致**：缓存与数据库可能不一致；要明确产品能容忍多大的陈旧程度。

命中率决定收益：$T_{avg} = h\,T_{cache} + (1-h)(T_{cache} + T_{db})$。

## 示例讲解
推荐接口从 Postgres 读取用户特征需要 50 ms。Redis 查询耗时 1 ms。命中率 $h = 0.9$ 时，未命中耗时 $1 + 50 = 51$ ms，所以 $T_{avg} = 0.9 \cdot 1 + 0.1 \cdot 51 = 6.0$ ms，快了 8 倍。数据库现在只承担 10% 的流量：1,000 req/s 变为 100 req/s。把 $h$ 提高到 0.99 得到 $0.99 + 0.51 = 1.5$ ms，数据库只有 10 req/s。设置 300 s 的 TTL 并加上最多 30 s 的随机抖动，可以分散过期时间，避免所有键同时过期。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 cache-aside 中，缓存未命中时会发生什么？",
  "options": ["请求失败", "应用读取数据库，然后把结果存入缓存", "缓存自己读取数据库，应用等待回调", "应用同时写缓存和数据库"],
  "explanation": "Cache-aside 由应用驱动：先查缓存，未命中则从权威数据源加载并填充缓存。其他选项描述的是 read-through 或 write-through。"
}
```

```quiz
{
  "id": "q2",
  "question": "一个热门键过期后，数据库被成千上万个同时到来的相同查询淹没。这是什么，如何解决？",
  "options": ["缓存穿透；使用更大的缓存", "缓存击穿（stampede）；加 TTL 抖动、按键加锁或请求合并", "淘汰；改用 LFU", "写回失败；改用 write-through"],
  "explanation": "这是缓存击穿（惊群）。让一个请求重建值，其他请求等待或返回旧数据，并随机化 TTL。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `TTLCache(capacity, ttl, clock)`，一个条目会过期的 LRU 缓存。`clock()` 返回当前时间。`put(key, value)` 存储值，过期时间为 `clock() + ttl`，并标记为最近使用；如果大小超过 `capacity`，淘汰最近最少使用的条目。`get(key)` 返回值，若不存在或已过期则返回 `None`（当 `clock() >= expires_at` 时视为过期；并删除该条目）。成功的 `get` 会把该键标记为最近使用。",
  "hints": ["OrderedDict 保持插入顺序；move_to_end 把键标记为最近使用，popitem(last=False) 删除最旧的。", "存储 (value, expires_at) 元组，并在 get 内惰性检查过期。"]
}
```

> [!TIP] 面试技巧
> - 默认回答：带 TTL 的 cache-aside，写入时删除（而非更新）。然后主动提到击穿、穿透和陈旧问题。
> - 说明缓存什么以及为什么安全：读多写少、能容忍轻微陈旧、计算昂贵（特征、预测、聚合）。
> - Redis 命令是单线程执行的，所以单个操作是原子的；简单的锁可用 `SET key val NX EX`，并提到对纯缓存而言持久化（RDB/AOF）是可选的。
