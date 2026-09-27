---
title: LiteLLM
description: Monitor LiteLLM proxy stats (models, spend, requests, users and more) in your Homepage dashboard.
---

# LiteLLM

LiteLLM is a fast proxy to 100+ LLM APIs with unified interfaces (OpenAI, Anthropic, etc.).
This widget reads from the LiteLLM proxy admin API and shows up to **four fields of your choice**.

:::info
The `models` field works with any LiteLLM key. The other fields (`spend`, `budget`,
`requests`, `tokens`, `users`, `cache`, `failed`, `top_model`) require an
**admin/master key** — with a standard virtual key those blocks simply show `-`.
:::

## Fields

| Field        | Label            | Endpoint                       | Description                                        |
| ------------ | ---------------- | ------------------------------ | -------------------------------------------------- |
| `models`     | Models           | `GET /v1/models`               | Number of available models (works with any key)    |
| `spend`      | Spend (all time) | `GET /global/spend`            | Total spend across all time (USD)                  |
| `budget`     | Budget Used      | `GET /global/spend`            | Spend as a percentage of `max_budget` (admin)      |
| `requests`   | Requests (30d)   | `GET /global/activity`         | API requests in the last 30 days                   |
| `tokens`     | Tokens (30d)     | `GET /global/activity`         | Tokens in the last 30 days                         |
| `users`      | Users            | `GET /user/list`               | Number of users (admin)                            |
| `cache`      | Cache Hit (30d)  | `GET /global/activity/cache_hits` | Cache hit ratio over the last 30 days            |
| `failed`     | Failed (30d)     | `GET /global/activity/cache_hits` | Failed requests over the last 30 days            |
| `top_model`  | Top Model        | `GET /global/spend/models`     | Highest-spending model, all time (admin)           |

Pick up to **four** fields via `widget.fields` — default is `["models", "spend", "requests", "tokens"]`.
Only the endpoints needed by the selected fields are fetched.

Note that `spend`, `budget` and `top_model` are **all-time** totals — the LiteLLM
endpoints behind them (`/global/spend`, `/global/spend/models`) do not accept a date range.
The `(30d)` fields use the last 30 days.

## Services Config

```yaml title="services.yaml"
services:
  LiteLLM:
    icon: litellm.png
    href: http://litellm.example.com:4000/ui
    widget:
      type: litellm
      url: http://litellm.example.com:4000
      key: sk-1234 # LiteLLM master (admin) key
      # days: 30 # optional window in days for requests/tokens/cache/failed (default 30)
      # fields: # optional, max 4 (default: models, spend, requests, tokens)
      #   - models
      #   - spend
      #   - budget
      #   - requests
      #   - tokens
      #   - users
      #   - cache
      #   - failed
      #   - top_model
```
