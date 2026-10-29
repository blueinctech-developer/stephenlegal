-- Stephen Legal content database. Safe to run repeatedly (npm run db:migrate).

create table if not exists authors (
	id serial primary key,
	slug text not null unique,
	name text not null,
	bio text not null default '',
	avatar_url text,
	wp_id integer unique
);

create table if not exists terms (
	id serial primary key,
	taxonomy text not null check (taxonomy in ('category', 'tag')),
	slug text not null,
	name text not null,
	description text not null default '',
	parent_id integer references terms(id) on delete set null,
	wp_id integer,
	unique (taxonomy, slug),
	unique (taxonomy, wp_id)
);

create table if not exists media (
	id serial primary key,
	url text not null,
	storage_key text not null unique,
	original_url text unique,
	mime text not null default 'image/jpeg',
	width integer,
	height integer,
	size_bytes integer,
	alt text not null default '',
	caption text not null default '',
	wp_id integer unique,
	created_at timestamptz not null default now()
);

create table if not exists posts (
	id serial primary key,
	type text not null default 'post' check (type in ('post', 'page')),
	slug text not null,
	title text not null,
	excerpt text not null default '',
	content text not null default '',
	status text not null default 'draft' check (status in ('draft', 'published')),
	published_at timestamptz,
	modified_at timestamptz not null default now(),
	created_at timestamptz not null default now(),
	author_id integer references authors(id) on delete set null,
	featured_media_id integer references media(id) on delete set null,
	seo_title text not null default '',
	seo_description text not null default '',
	sticky boolean not null default false,
	wp_id integer,
	search tsvector generated always as (
		setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
		setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
		setweight(to_tsvector('english', regexp_replace(coalesce(content, ''), '<[^>]+>', ' ', 'g')), 'C')
	) stored,
	unique (type, slug),
	unique (type, wp_id)
);
create index if not exists posts_listing on posts (type, status, published_at desc);
create index if not exists posts_search on posts using gin (search);

create table if not exists post_terms (
	post_id integer not null references posts(id) on delete cascade,
	term_id integer not null references terms(id) on delete cascade,
	position integer not null default 0,
	primary key (post_id, term_id)
);
create index if not exists post_terms_term on post_terms (term_id);

create table if not exists users (
	id serial primary key,
	email text not null unique,
	name text not null,
	password_hash text not null,
	role text not null default 'editor' check (role in ('admin', 'editor')),
	author_id integer references authors(id) on delete set null,
	created_at timestamptz not null default now(),
	last_login_at timestamptz
);

create table if not exists sessions (
	id text primary key,
	user_id integer not null references users(id) on delete cascade,
	expires_at timestamptz not null,
	created_at timestamptz not null default now()
);

create table if not exists submissions (
	id serial primary key,
	form text not null,
	data jsonb not null,
	email_sent boolean not null default false,
	read_at timestamptz,
	created_at timestamptz not null default now()
);
