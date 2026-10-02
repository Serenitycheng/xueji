CREATE TABLE "study_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"revision" integer NOT NULL,
	"data" text NOT NULL,
	"reason" text NOT NULL,
	"app_version" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fingerprint" text NOT NULL,
	"status" text NOT NULL,
	"status_code" integer DEFAULT 202 NOT NULL,
	"result" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "study_profiles" ADD COLUMN "updated_at" text DEFAULT now()::text NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_history_user_revision" ON "study_history" USING btree ("user_id","revision");--> statement-breakpoint
CREATE INDEX "idx_receipts_user" ON "study_receipts" USING btree ("user_id");
--> statement-breakpoint
INSERT INTO study_history(id,user_id,revision,data,reason,app_version,created_at)
SELECT user_id||':'||revision,user_id,revision,data,'启用版本保护前的备份','0.1.0',updated_at FROM study_profiles ON CONFLICT(id) DO NOTHING;
--> statement-breakpoint
CREATE FUNCTION study_profile_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF current_setting('study.write_protocol',true) IS DISTINCT FROM '2' THEN
  RAISE EXCEPTION 'STUDY_WRITE_PROTOCOL: outdated writer rejected';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF (NEW.data::jsonb->>'version') IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'STUDY_UNSUPPORTED_DATA_VERSION'; END IF;
 IF NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'STUDY_REVISION_CONFLICT'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION study_assert_receipt(p_id text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE current_status text;
BEGIN
 SELECT status INTO current_status FROM study_receipts WHERE id=p_id FOR UPDATE;
 IF current_status IS DISTINCT FROM 'processing' THEN RAISE EXCEPTION 'STUDY_COMMAND_CANCELLED'; END IF;
END $$;
--> statement-breakpoint
CREATE TRIGGER study_profile_write_guard BEFORE UPDATE OR DELETE ON study_profiles FOR EACH ROW EXECUTE FUNCTION study_profile_guard();
--> statement-breakpoint
CREATE FUNCTION study_profile_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO study_history(id,user_id,revision,data,reason,app_version,created_at)
 VALUES(NEW.user_id||':'||NEW.revision,NEW.user_id,NEW.revision,NEW.data,
 COALESCE(NULLIF(current_setting('study.change_reason',true),''),'建立学习空间'),
 COALESCE(NULLIF(current_setting('study.app_version',true),''),'0.2.0'),NEW.updated_at)
 ON CONFLICT(id) DO NOTHING;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER study_profile_archive AFTER INSERT OR UPDATE ON study_profiles FOR EACH ROW EXECUTE FUNCTION study_profile_history();
--> statement-breakpoint
CREATE FUNCTION study_save_profile(p_user text,p_data text,p_revision integer) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE next_revision integer;
BEGIN
 UPDATE study_profiles SET data=p_data,revision=revision+1,updated_at=to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
 WHERE user_id=p_user AND revision=p_revision RETURNING revision INTO next_revision;
 IF NOT FOUND THEN RAISE EXCEPTION 'STUDY_REVISION_CONFLICT'; END IF;
 RETURN next_revision;
END $$;
