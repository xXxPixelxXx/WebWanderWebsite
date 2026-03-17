-- WebWander — Supabase schema
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- Re-running this file is safe (idempotent via IF NOT EXISTS and DROP IF EXISTS).

-- ============================================================
-- Tables
-- ============================================================

-- Curated sites (admin-managed; never written by the anon key)
create table if not exists community_sites (
  id             uuid primary key default gen_random_uuid(),
  url            text not null,
  label          text not null,
  category       text not null default 'random',
  upvote_count   int  not null default 0,
  downvote_count int  not null default 0,
  created_at     timestamptz default now()
);
create unique index if not exists community_sites_url_idx on community_sites (lower(url));

-- User-submitted site suggestions (written by anon key; promoted by votes)
create table if not exists suggestions (
  id             uuid primary key default gen_random_uuid(),
  url            text not null,
  label          text not null,
  category       text not null default 'random',
  tags           text[] default '{}',
  upvote_count   int  not null default 0,
  downvote_count int  not null default 0,
  created_at     timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table community_sites enable row level security;
alter table suggestions      enable row level security;

-- Drop old policies so re-running is safe
drop policy if exists "Read community_sites"   on community_sites;
drop policy if exists "Insert community_sites" on community_sites;
drop policy if exists "Update community_sites" on community_sites;
drop policy if exists "Read suggestions"       on suggestions;
drop policy if exists "Insert suggestions"     on suggestions;
drop policy if exists "Update suggestions"     on suggestions;

-- community_sites: read-only for anon. Writes handled by admin/service role only.
create policy "Read community_sites" on community_sites
  for select using (true);

-- suggestions: anyone can read
create policy "Read suggestions" on suggestions
  for select using (true);

-- suggestions: validated insert — url must be http(s), label non-empty,
--   category from allowed list, vote counts must start at 0.
create policy "Insert suggestions" on suggestions
  for insert with check (
    length(trim(url))   between 10 and 500
    and url ~ '^https?://'
    and length(trim(label)) between 1 and 150
    and category in (
      'tech','learning','tools','entertainment','deals','random',
      'culture','fun','ideas','design','health','gaming',
      'food','nature','music','finance','film','books','travel','cute','handcraft'
    )
    and upvote_count   = 0
    and downvote_count = 0
  );

-- No anon UPDATE or DELETE on either table.
-- vote counts are managed server-side (Supabase edge function or admin panel).

-- ============================================================
-- Seed: community_sites starter pack
-- Run once; conflict on url is silently ignored.
-- ============================================================

insert into community_sites (url, label, category, upvote_count) values
  ('https://www.wikipedia.org',           'Wikipedia',          'learning',       42),
  ('https://news.ycombinator.com',        'Hacker News',        'tech',           38),
  ('https://www.are.na',                  'Are.na',             'ideas',          31),
  ('https://pudding.cool',                'The Pudding',        'culture',        28),
  ('https://www.theatlantic.com',         'The Atlantic',       'culture',        24),
  ('https://www.gutenberg.org',           'Project Gutenberg',  'books',          22),
  ('https://radio.garden',               'Radio Garden',        'music',          35),
  ('https://neal.fun',                    'Neal.fun',           'fun',            40),
  ('https://www.mubi.com',               'MUBI',               'film',           19),
  ('https://www.duolingo.com',           'Duolingo',            'learning',       33),
  ('https://www.khanacademy.org',        'Khan Academy',        'learning',       29),
  ('https://unsplash.com',               'Unsplash',            'design',         26),
  ('https://www.nps.gov/index.htm',      'National Park Service','nature',        21),
  ('https://www.allrecipes.com',         'Allrecipes',          'food',           18),
  ('https://www.stardew.farm',           'Stardew Farm Planner','gaming',         16),
  ('https://www.moma.org',              'MoMA',                 'design',         23),
  ('https://archive.org',               'Internet Archive',     'learning',       37),
  ('https://www.instructables.com',     'Instructables',        'handcraft',      20),
  ('https://www.meteoblue.com',         'Meteoblue',            'nature',         14),
  ('https://www.openculture.com',       'Open Culture',         'learning',       25)
on conflict do nothing;
