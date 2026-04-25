# API Reference

## Authentication

All `/api/v1/*` endpoints require an API key:

```
Authorization: Bearer ak_your_api_key_here
```

## Endpoints

### Health

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Service health status |
| GET | `/health/ready` | Readiness check |

### Webhooks

| Method | Path | Description |
|---|---|---|
| POST | `/webhooks/github` | GitHub webhook receiver |

### Tenants

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/tenants/:id` | Get tenant details + stats |
| PATCH | `/api/v1/tenants/:id/settings` | Update tenant settings |

### Tasks

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/tasks` | List tasks (paginated, filterable) |
| GET | `/api/v1/tasks/:id` | Get task detail with executions |
| POST | `/api/v1/tasks` | Create task manually |
| POST | `/api/v1/tasks/:id/cancel` | Cancel a running task |

**Query parameters for GET /tasks:**
- `status` — filter by status
- `page` — page number (default: 1)
- `limit` — items per page (default: 20, max: 100)

### Metrics

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/metrics` | Tenant dashboard metrics |

**Query parameters:**
- `range` — time range: `1d`, `7d`, `30d`

**Response:**
```json
{
  "range": "7d",
  "tasks": { "total": 45, "completed": 38, "failed": 7, "successRate": 84 },
  "pullRequests": { "total": 38, "merged": 32, "mergeRate": 84 },
  "performance": { "totalDurationMs": 245000, "avgDurationMs": 6400, "totalCostCents": 1200 },
  "budget": { "monthlyLimitCents": 50000, "spentCents": 12000, "remainingPercent": 76 }
}
```

### Prometheus Metrics

| Method | Path | Port | Description |
|---|---|---|---|
| GET | `/metrics` | 9090 | Prometheus-format metrics |
