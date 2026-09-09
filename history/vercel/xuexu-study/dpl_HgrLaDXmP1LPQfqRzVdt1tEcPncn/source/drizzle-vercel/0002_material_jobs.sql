CREATE TABLE study_material_jobs (
 id text PRIMARY KEY, user_id text NOT NULL, material_id text NOT NULL,
 status text NOT NULL DEFAULT 'queued', pages integer NOT NULL DEFAULT 0,
 done integer NOT NULL DEFAULT 0, scanned text NOT NULL DEFAULT '[]',
 base_text_path text, published_path text, run_id text, error text,
 updated_at text NOT NULL DEFAULT now()::text,
 UNIQUE(user_id,material_id)
);
--> statement-breakpoint
CREATE TABLE study_material_pages (
 job_id text NOT NULL REFERENCES study_material_jobs(id), page integer NOT NULL,
 content text NOT NULL, method text NOT NULL,
 PRIMARY KEY(job_id,page)
);
