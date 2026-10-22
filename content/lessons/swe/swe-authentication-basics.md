---
id: swe-authentication-basics
title: "Authentication basics (OAuth, API keys, JWT)"
estimatedMinutes: 13
difficulty: medium
tags: [authentication, oauth, jwt, api-keys, security]
---

## Why it matters
Every model endpoint, dashboard and data API needs to answer "who is calling, and what may they do?" Leaks of API keys in notebooks and misconfigured tokens are real incidents. Interviews test whether you can tell authentication from authorization and pick between API keys, OAuth and JWTs.

## Concept
**Authentication (authn)** = who are you? **Authorization (authz)** = what may you do? 401 vs 403.

**API keys**: a long random secret sent in a header (`X-API-Key`). Simple, good for server-to-server and per-client rate limiting. Weaknesses: no user identity or expiry by default, whoever holds it is you. Store only a **hash** server-side, support rotation and scopes, and send only over HTTPS.

**OAuth 2.0** is a *delegation* framework: a user lets an app act on their behalf at a provider (Google, GitHub) without sharing the password. **OpenID Connect (OIDC)** adds an `id_token` for identity ("log in with Google").

```text
Authorization Code flow (+ PKCE for public clients)
1. App redirects user to provider /authorize?client_id=...&scope=...&state=...&code_challenge=...
2. User logs in and consents at the provider (the app never sees the password)
3. Provider redirects back with ?code=ABC&state=...   (verify state to stop CSRF)
4. App's backend POSTs code (+ client secret or PKCE verifier) to /token
5. Provider returns access_token (short-lived), refresh_token (long-lived), id_token (OIDC identity)
6. App calls the API with  Authorization: Bearer <access_token>
```

- **Access token**: short-lived (minutes), sent on each API call. **Refresh token**: long-lived, used only to obtain new access tokens; store it securely and rotate it.
- **Scopes** limit what a token can do (`predict:read`). Machine-to-machine services use the *client credentials* grant.

**JWT (JSON Web Token)**: a signed, self-contained token, so servers verify it **without a database lookup**.

```text
header   = {"alg":"HS256","typ":"JWT"}
payload  = {"sub":"user_42","scope":"predict:read","iat":1700000000,"exp":1700003600}
token    = b64url(header) + "." + b64url(payload) + "." + b64url(HMAC_SHA256(secret, header.payload))
```

- **HS256** uses one shared secret (HMAC); **RS256** uses a private key to sign and a public key to verify (better across services).
- The payload is only **encoded, not encrypted**: anyone can read it, so never put secrets in it. The signature only guarantees it was not tampered with.
- Validate signature, `exp`, `iss`/`aud`, and **pin the algorithm** (reject `alg: none`). Keep lifetimes short; JWTs cannot be revoked before `exp` without a deny-list.

**Passwords and sessions**: hash with bcrypt/argon2 (never plain or fast SHA); cookies get `HttpOnly`, `Secure`, `SameSite`.

## Worked example
Scenario: your churn model API issues 15-minute JWTs with `scope=predict:read`.

1. Client posts credentials, receives a JWT signed with HS256 at `iat=1700000000`, `exp=1700000900`.
2. At 1700000500 a request arrives: the server recomputes the HMAC over `header.payload`, compares it in constant time, checks `exp > now`, and reads `sub` and `scope`, with no database call.
3. An attacker edits the payload to `scope=admin`: the signature no longer matches, so the request is rejected.
4. At 1700000900 the token expires and the client uses its refresh token to get a new one.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which statement about a standard signed JWT (JWS) is true?",
  "options": [
    "The payload is encrypted, so it can hold secrets",
    "The payload is only base64url-encoded: readable by anyone, but tampering is detected by the signature",
    "It can always be revoked instantly without server state",
    "The signature is optional"
  ],
  "answer": 1,
  "explanation": "Signed JWTs provide integrity, not confidentiality. Revocation before exp needs extra state such as a deny-list."
}
```

```quiz
{
  "id": "q2",
  "question": "What problem does OAuth 2.0 mainly solve?",
  "options": [
    "Encrypting data at rest",
    "Hashing passwords",
    "Letting an app access a user's resources at a provider without receiving the user's password",
    "Rate limiting"
  ],
  "answer": 2,
  "explanation": "OAuth delegates limited, revocable access via tokens and scopes; OIDC adds identity on top."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement HS256 JWTs with the standard library. `sign_jwt(payload, secret)` returns `b64url(header).b64url(payload).b64url(signature)` (compact, key-sorted JSON). `verify_jwt(token, secret, now)` returns the payload, or raises `ValueError` with message 'malformed' (not 3 parts), 'bad alg' (header alg is not HS256), 'bad signature' (HMAC mismatch, constant-time compare), or 'expired' (`exp <= now`, when `exp` is present).",
  "starterCode": "import base64, hashlib, hmac, json\n\ndef b64url(data: bytes) -> str:\n    return base64.urlsafe_b64encode(data).rstrip(b\"=\").decode()\n\ndef b64url_decode(s: str) -> bytes:\n    return base64.urlsafe_b64decode(s + \"=\" * (-len(s) % 4))\n\ndef sign_jwt(payload, secret):\n    \"\"\"Return an HS256 JWT string: b64url(header).b64url(payload).b64url(signature).\n    header = {\"alg\": \"HS256\", \"typ\": \"JWT\"}; serialize both JSON objects with\n    json.dumps(obj, separators=(\",\", \":\"), sort_keys=True). secret is a str.\"\"\"\n    pass\n\ndef verify_jwt(token, secret, now):\n    \"\"\"Return the payload dict if the signature is valid and (when present) payload['exp'] > now.\n    Raise ValueError('malformed') if the token does not have 3 parts, ValueError('bad signature')\n    on signature mismatch (compare with hmac.compare_digest), ValueError('expired') if exp <= now.\n    Reject any token whose header alg is not HS256 with ValueError('bad alg').\"\"\"\n    pass\n",
  "tests": "tok = sign_jwt({\"sub\": \"u1\", \"exp\": 1000}, \"s3cret\")\nassert tok.count(\".\") == 2 and \"=\" not in tok\nassert verify_jwt(tok, \"s3cret\", now=999) == {\"sub\": \"u1\", \"exp\": 1000}\n\ndef expect(msg, fn):\n    try:\n        fn()\n    except ValueError as e:\n        assert str(e) == msg, (msg, str(e))\n        return\n    assert False, \"expected \" + msg\n\nexpect(\"expired\", lambda: verify_jwt(tok, \"s3cret\", now=1000))\nexpect(\"bad signature\", lambda: verify_jwt(tok, \"wrong\", now=1))\nh, p, s = tok.split(\".\")\nforged = b64url(json.dumps({\"sub\": \"admin\", \"exp\": 1000}, separators=(\",\", \":\"), sort_keys=True).encode())\nexpect(\"bad signature\", lambda: verify_jwt(h + \".\" + forged + \".\" + s, \"s3cret\", now=1))\nexpect(\"malformed\", lambda: verify_jwt(\"abc.def\", \"s3cret\", now=1))\nnone_hdr = b64url(b'{\"alg\":\"none\",\"typ\":\"JWT\"}')\nexpect(\"bad alg\", lambda: verify_jwt(none_hdr + \".\" + p + \".\", \"s3cret\", now=1))\nassert verify_jwt(sign_jwt({\"sub\": \"u2\"}, \"k\"), \"k\", now=10**12) == {\"sub\": \"u2\"}\n",
  "solution": "import base64, hashlib, hmac, json\n\ndef b64url(data: bytes) -> str:\n    return base64.urlsafe_b64encode(data).rstrip(b\"=\").decode()\n\ndef b64url_decode(s: str) -> bytes:\n    return base64.urlsafe_b64decode(s + \"=\" * (-len(s) % 4))\n\ndef _dumps(obj):\n    return json.dumps(obj, separators=(\",\", \":\"), sort_keys=True).encode()\n\ndef sign_jwt(payload, secret):\n    signing_input = b64url(_dumps({\"alg\": \"HS256\", \"typ\": \"JWT\"})) + \".\" + b64url(_dumps(payload))\n    sig = hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()\n    return signing_input + \".\" + b64url(sig)\n\ndef verify_jwt(token, secret, now):\n    parts = token.split(\".\")\n    if len(parts) != 3:\n        raise ValueError(\"malformed\")\n    h, p, s = parts\n    try:\n        header = json.loads(b64url_decode(h))\n    except Exception:\n        raise ValueError(\"malformed\")\n    if header.get(\"alg\") != \"HS256\":\n        raise ValueError(\"bad alg\")\n    expected = hmac.new(secret.encode(), (h + \".\" + p).encode(), hashlib.sha256).digest()\n    if not hmac.compare_digest(expected, b64url_decode(s)):\n        raise ValueError(\"bad signature\")\n    payload = json.loads(b64url_decode(p))\n    if \"exp\" in payload and payload[\"exp\"] <= now:\n        raise ValueError(\"expired\")\n    return payload\n",
  "hints": [
    "Signature = HMAC-SHA256(secret, header_b64 + '.' + payload_b64), then base64url without padding.",
    "Verify the signature before trusting any payload field; check alg first so `alg: none` is rejected."
  ]
}
```

> [!TIP] Interview tips
> - Draw the OAuth authorization-code flow and say the app never sees the user's password; mention `state` and PKCE.
> - Say "JWT is signed, not encrypted" and list what you validate (signature, exp, aud, algorithm).
> - Pitfall: API keys in git or notebooks, long-lived tokens in `localStorage`, and comparing signatures with `==` (use constant-time compare).
