---
id: swe-authentication-basics
title: "认证基础（OAuth、API key、JWT）"
---

## 为什么重要
每个模型接口、仪表盘和数据 API 都需要回答“调用者是谁，他们能做什么？”。notebook 中泄露的 API key 和配置错误的令牌都是真实发生过的事故。面试会考察你能否区分认证与授权，并在 API key、OAuth 和 JWT 之间做出选择。

## 概念
**认证（authn）** = 你是谁？**授权（authz）** = 你能做什么？对应 401 与 403。

**API key**：放在请求头中发送的长随机密钥（`X-API-Key`）。简单，适合服务器到服务器的调用和按客户端限流。缺点：默认没有用户身份和过期时间，持有者就等于你。服务端只存储其**哈希**，支持轮换和 scope，并且只通过 HTTPS 发送。

**OAuth 2.0** 是一个*委托*框架：用户让某个应用在提供方（Google、GitHub）上代表自己行事，而无需共享密码。**OpenID Connect（OIDC）**增加了用于身份的 `id_token`（“使用 Google 登录”）。

```text
Authorization Code flow (+ PKCE for public clients)
1. App redirects user to provider /authorize?client_id=...&scope=...&state=...&code_challenge=...
2. User logs in and consents at the provider (the app never sees the password)
3. Provider redirects back with ?code=ABC&state=...   (verify state to stop CSRF)
4. App's backend POSTs code (+ client secret or PKCE verifier) to /token
5. Provider returns access_token (short-lived), refresh_token (long-lived), id_token (OIDC identity)
6. App calls the API with  Authorization: Bearer <access_token>
```

- **Access token**：短期有效（几分钟），每次 API 调用都携带。**Refresh token**：长期有效，只用于获取新的 access token；需安全存储并轮换。
- **Scope** 限制令牌能做什么（`predict:read`）。机器到机器的服务使用 *client credentials* 授权方式。

**JWT（JSON Web Token）**：一种带签名、自包含的令牌，因此服务器**无需查询数据库**即可验证。

```text
header   = {"alg":"HS256","typ":"JWT"}
payload  = {"sub":"user_42","scope":"predict:read","iat":1700000000,"exp":1700003600}
token    = b64url(header) + "." + b64url(payload) + "." + b64url(HMAC_SHA256(secret, header.payload))
```

- **HS256** 使用一个共享密钥（HMAC）；**RS256** 用私钥签名、公钥验证（跨服务时更好）。
- payload 只是**编码，并未加密**：任何人都能读取，所以绝不要把秘密放进去。签名只保证内容没被篡改。
- 验证签名、`exp`、`iss`/`aud`，并**固定算法**（拒绝 `alg: none`）。保持较短的有效期；在 `exp` 之前如果没有黑名单就无法撤销 JWT。

**密码与会话**：用 bcrypt/argon2 哈希（绝不明文或使用快速 SHA）；cookie 要设置 `HttpOnly`、`Secure`、`SameSite`。

## 示例讲解
场景：你的流失预测模型 API 签发有效期 15 分钟、`scope=predict:read` 的 JWT。

1. 客户端提交凭证，收到用 HS256 签名的 JWT，`iat=1700000000`，`exp=1700000900`。
2. 在 1700000500 时来了一个请求：服务器对 `header.payload` 重新计算 HMAC，用恒定时间比较，检查 `exp > now`，并读取 `sub` 和 `scope`，不需要访问数据库。
3. 攻击者把 payload 改成 `scope=admin`：签名不再匹配，请求被拒绝。
4. 在 1700000900 令牌过期，客户端用它的 refresh token 获取新令牌。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "关于标准的带签名 JWT（JWS），哪项说法正确？",
  "options": [
    "payload 是加密的，所以可以存放秘密",
    "payload 只是 base64url 编码：任何人都能读取，但篡改会被签名检测出来",
    "无需服务器状态就能随时立即撤销",
    "签名是可选的"
  ],
  "explanation": "带签名的 JWT 提供完整性而非保密性。在 exp 之前撤销需要额外状态，例如黑名单。"
}
```

```quiz
{
  "id": "q2",
  "question": "OAuth 2.0 主要解决什么问题？",
  "options": [
    "静态数据加密",
    "密码哈希",
    "让应用无需获得用户密码即可访问用户在提供方的资源",
    "限流"
  ],
  "explanation": "OAuth 通过令牌和 scope 委托有限且可撤销的访问；OIDC 在其上增加身份信息。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "用标准库实现 HS256 JWT。`sign_jwt(payload, secret)` 返回 `b64url(header).b64url(payload).b64url(signature)`（紧凑、键排序的 JSON）。`verify_jwt(token, secret, now)` 返回 payload，或抛出带以下消息的 `ValueError`：'malformed'（不是 3 部分）、'bad alg'（header 的 alg 不是 HS256）、'bad signature'（HMAC 不匹配，使用恒定时间比较）、'expired'（存在 `exp` 且 `exp <= now`）。",
  "hints": [
    "签名 = HMAC-SHA256(secret, header_b64 + '.' + payload_b64)，再做不带填充的 base64url。",
    "在信任任何 payload 字段之前先验证签名；先检查 alg，以便拒绝 `alg: none`。"
  ]
}
```

> [!TIP] 面试技巧
> - 画出 OAuth 授权码流程，并说明应用永远看不到用户的密码；提到 `state` 和 PKCE。
> - 说“JWT 是签名而非加密”，并列出你要验证的内容（签名、exp、aud、算法）。
> - 陷阱：API key 出现在 git 或 notebook 中、长期令牌存放在 `localStorage`、用 `==` 比较签名（应使用恒定时间比较）。
