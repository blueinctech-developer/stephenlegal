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

-- Added with the full WordPress replacement (see WORDPRESS-AUDIT.md). Safe to re-run.

-- Reader view counts, carried over from the theme's counter (_empath_views_count).
alter table posts add column if not exists views integer not null default 0;

-- Enquiry handling: a status, private notes, and when they last changed.
alter table submissions add column if not exists status text not null default 'new';
alter table submissions add column if not exists notes text not null default '';
alter table submissions add column if not exists updated_at timestamptz not null default now();
do $$ begin
	alter table submissions add constraint submissions_status check (status in ('new', 'in_progress', 'resolved', 'spam'));
exception when duplicate_object then null; end $$;
create index if not exists submissions_created on submissions (created_at desc);

-- Site-wide settings edited in the admin (contact details, social links, menus, forms).
create table if not exists settings (
	key text primary key,
	value jsonb not null,
	updated_at timestamptz not null default now(),
	updated_by integer references users(id) on delete set null
);

-- What was changed in the admin, by whom.
create table if not exists activity (
	id serial primary key,
	user_id integer references users(id) on delete set null,
	user_name text not null default '',
	action text not null,
	target text not null default '',
	created_at timestamptz not null default now()
);
create index if not exists activity_created on activity (created_at desc);
