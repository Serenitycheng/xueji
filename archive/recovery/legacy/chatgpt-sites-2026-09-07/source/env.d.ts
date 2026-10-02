/// <reference types="vite/client" />
declare namespace Cloudflare { interface Env { DB: D1Database; FILES: R2Bucket; STUDY_ENCRYPTION_KEY?: string; } }
