import {neon} from '@neondatabase/serverless';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL ausente.');
const sql=neon(process.env.DATABASE_URL);
await sql.transaction([
 sql`CREATE TABLE IF NOT EXISTS fv_workspace(id text PRIMARY KEY,revision integer NOT NULL,state jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())`,
 sql`CREATE TABLE IF NOT EXISTS fv_workspace_history(id bigserial PRIMARY KEY,workspace_id text NOT NULL,revision integer NOT NULL,state jsonb NOT NULL,saved_at timestamptz NOT NULL DEFAULT now())`,
 sql`CREATE OR REPLACE FUNCTION fv_workspace_archive() RETURNS trigger AS $$ BEGIN INSERT INTO fv_workspace_history(workspace_id,revision,state) VALUES(OLD.id,OLD.revision,OLD.state); DELETE FROM fv_workspace_history WHERE workspace_id=OLD.id AND id NOT IN(SELECT id FROM fv_workspace_history WHERE workspace_id=OLD.id ORDER BY id DESC LIMIT 100); RETURN NEW; END; $$ LANGUAGE plpgsql`,
 sql`DROP TRIGGER IF EXISTS fv_workspace_history_trigger ON fv_workspace`,
 sql`CREATE TRIGGER fv_workspace_history_trigger BEFORE UPDATE ON fv_workspace FOR EACH ROW EXECUTE FUNCTION fv_workspace_archive()`,
 sql`CREATE TABLE IF NOT EXISTS fv_connections(provider text PRIMARY KEY,payload text NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())`,
 sql`CREATE TABLE IF NOT EXISTS fv_login_limits(key text PRIMARY KEY,count integer NOT NULL,window_start timestamptz NOT NULL DEFAULT now())`,
 sql`CREATE TABLE IF NOT EXISTS fv_jobs(id uuid PRIMARY KEY,provider text NOT NULL,kind text NOT NULL,status text NOT NULL,result jsonb,created_at timestamptz NOT NULL DEFAULT now())`
]);
console.log('Banco preparado: workspace, histórico, conexões protegidas e limites de acesso.');
