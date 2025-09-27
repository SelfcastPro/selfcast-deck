# Talentscout Environment Setup

Create a local `.env` file by copying `.env.example`:

```bash
cp .env.example .env
```

Update the following variables:

- `INGEST_TOKEN` (required) – the shared secret used to validate ingest webhook requests. This value **must exactly match** the token you configure in the Apify webhook header so incoming payloads are accepted.
- `APIFY_DATASET_ID` (required) – the Apify dataset that stores the Instagram profiles surfaced on the TalentScout board. Use the dataset ID provided for the production scraper.
- `APIFY_TOKEN` (required) – the Apify API token used when fetching profiles for the board UI. This must correspond to the same Apify account that owns the dataset.

The `.env` file is ignored by git to keep secrets out of version control. Store any sensitive values locally only.
