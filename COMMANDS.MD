npm install
npm run migrate # create/upgrade the SQLite DB
npm run cli sync-taxonomies # create WP categories + whitelist tags on your site

npm run cli ingest-keywords # load data/keyword.csv → queue (status=planned, idempotent)
npm run cli run # run the full pipeline (keyword → WP draft)
npm run cli queue-summary # check status counts

npm run cli run --limit 5 # (not supported) → instead raise the tick limit in .env
npm run cli ingest-keywords --limit 3 # ingest only the first 3 CSV rows
npm run cli ingest-keywords --dry-run # preview, no DB writes
npm run cli status # throttle/quota/last-run info
npm run cli dropped-tag-report # weekly tag review
npm run cli weekly-ops-report # weekly ops report

PIPELINE_MAX_JOBS_PER_TICK=5
DAILY_JOB_QUOTA=5

npm run dev # starts the server + built-in cron (CRON_ENABLED=true, CRON_SCHEDULE=0 6 \* \* \*)

node -e "const D=require('better-sqlite3');const db=new D('data/pipeline.db');db.prepare(\"UPDATE publish_queue SET status='planned', fail_reasons=NULL WHERE status IN ('failed','hold')\").run();db.close();"
npm run cli run
