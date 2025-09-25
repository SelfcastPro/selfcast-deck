# Talentscout Environment Setup

Create a local `.env` file by copying `.env.example`:

```bash
cp .env.example .env
```

Update the following variables:

- `INGEST_TOKEN` (required) – the shared secret used to validate ingest webhook requests. This value **must exactly match** the token you configure in the Apify webhook header so incoming payloads are accepted.
- `APIFY_TOKEN` (optional) – reserved for future integrations that call the Apify API directly. Leave this blank unless instructed otherwise.

The `.env` file is ignored by git to keep secrets out of version control. Store any sensitive values locally only.
