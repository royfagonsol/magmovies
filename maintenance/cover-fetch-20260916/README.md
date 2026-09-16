# Cover fetch checkpoint — 16 September 2026

{
  "records_checked": 651,
  "saved": 119,
  "saved_links_verified_in_database": 119,
  "manual_preserved": 23,
  "looked_up_no_usable_image": 59,
  "awaiting_lookup_quota": 450,
  "stop_reason": "UPCitemdb daily allowance exhausted",
  "database_records_now": 651
}

All 651 records were checked for retrievable existing source images. Manual covers were preserved. Barcode lookup was limited by UPCitemdb free allowance; no-result responses from the early API pass were not treated as confirmed misses because the API suppresses provider errors. Existing-source caching saved 106; paced direct lookup with alternative image URLs saved 13. Only image_url and cover_source were written by these scripts. Other user edits occurred concurrently. Images were uploaded with unique filenames through the application and fetched back to verify an image signature. Pending.json separates 59 completed lookups with no usable image from 450 still awaiting lookup allowance. Backups and per-record results are retained here.

No scheduled or background continuation is running. On a user-requested resume, lookup.py skips completed lookups and stops on rate limits. Do not rerun fetch.py (the first attempt used a pace unsuitable for the free provider).
