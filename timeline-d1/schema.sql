CREATE TABLE IF NOT EXISTS events (
  id integer PRIMARY KEY AUTOINCREMENT,
  name text NOT NULL,
  description text,
    start_date text NOT NULL,
    end_date text,
    image text,
    embed_link text,
    main_tag_id integer NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id integer PRIMARY KEY AUTOINCREMENT,
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS event_tags (
tag_id integer NOT NULL,
  event_id integer NOT NULL
);