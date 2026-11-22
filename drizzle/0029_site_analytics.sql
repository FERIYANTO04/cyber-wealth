CREATE TABLE IF NOT EXISTS site_visit (
  id text PRIMARY KEY,
  visitor_hash text NOT NULL,
  path text NOT NULL,
  viewed_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_visit_viewed_at_idx ON site_visit (viewed_at);
CREATE INDEX IF NOT EXISTS site_visit_visitor_day_idx ON site_visit (visitor_hash, viewed_at);
CREATE INDEX IF NOT EXISTS site_visit_path_idx ON site_visit (path, viewed_at);
