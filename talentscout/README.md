# Talentscout – Instagram Outreach Board

This board replaces the old Talentscout Next.js app with a lightweight, database-free workflow that lives alongside the existing Casting Radar dashboard. Talentscout focuses purely on Instagram scouting, while Casting Radar (the `/radar` directory) continues to monitor public casting job feeds. The two boards now run independently so the scouting workflow is no longer tied to the job crawler.

## What lives in this folder
- **`index.html`** – Talentscout dashboard UI. Open this file (or deploy the folder as static hosting) to review and update leads.
- **`app.js`** – Client-side logic for filters, local edits, and the detail panel. Updates are stored in the browser’s `localStorage`, so no database or API is required.
- **`styles.css`** – Styling for the dashboard.
- **`data/leads.json`** – Seed data for scouting leads. Extend this with real profiles as you scrape or log them.
- **`data/hashtags.json`** – Authoritative list of Instagram hashtags to follow, matching the scouting brief.

## Using the dashboard
1. Load `index.html` locally (or deploy the folder). The left panel lists leads, the right panel shows details and includes status/notes editors.
2. Filter by search term, status, source, or “priority only” to manage outreach sequences.
3. Select a lead to:
   - Open the Instagram profile or source post in a new tab.
   - Log the latest contact date, notes, and whether the lead is a priority.
   - Copy the handle for quick DM/comment work.
4. All edits are stored in `localStorage` under the key `sc_talentscout_updates_v1`. Clearing browser storage resets the board to the values in `data/leads.json`.

## Updating source data
- **Add or edit leads** by changing `data/leads.json`. The schema is:
  ```json
  {
    "handle": "string",
    "followers": number,
    "location": "string",
    "source": "#hashtag or @profile",
    "post_url": "https://…",
    "profile_url": "https://…",
    "tags": ["array", "of", "strings"],
    "notes": "string",
    "status": "New | Contacted | Follow-up | Converted | Disqualified",
    "last_contacted": "YYYY-MM-DD" | null,
    "priority": true | false
  }
  ```
- **Adjust the hashtag watchlist** by editing `data/hashtags.json`. The board reads the array as-is, so the order you specify becomes the display order.

## Suggested workflow
1. Run your Instagram scraper (or do manual logging) against the hashtag list.
2. Append new finds to `data/leads.json` with the key metadata.
3. Use the Talentscout board during outreach sessions to record contact attempts and prioritise talent.
4. Keep using the Casting Radar board for inbound casting jobs; Talentscout is strictly for the Instagram talent pipeline.

Because this implementation is static, you can iterate quickly without worrying about Prisma, databases, or server environments. When you are ready for automation, the same data files can feed a future backend.
