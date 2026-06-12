-- =====================================================
-- TABLES TIER LIST — à exécuter dans l'éditeur SQL Supabase
-- =====================================================

create table if not exists tierlist (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  created_at timestamptz not null default now()
);

create table if not exists tierlist_niveaux (
  id uuid primary key default gen_random_uuid(),
  tierlist_id uuid not null references tierlist(id) on delete cascade,
  nom text not null,
  couleur text not null default '#AAAAAA',
  ordre int not null default 0
);

create table if not exists tierlist_items (
  id uuid primary key default gen_random_uuid(),
  tierlist_id uuid not null references tierlist(id) on delete cascade,
  niveau_id uuid references tierlist_niveaux(id) on delete set null,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists tierlist_votes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references tierlist_items(id) on delete cascade,
  auteur text not null check (auteur in ('wesley', 'lauriane')),
  niveau_id uuid not null references tierlist_niveaux(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (item_id, auteur) -- requis pour l'upsert onConflict 'item_id,auteur'
);

-- RLS désactivé (accès via la clé anon, compte partagé)
alter table tierlist disable row level security;
alter table tierlist_niveaux disable row level security;
alter table tierlist_items disable row level security;
alter table tierlist_votes disable row level security;
