-- =====================================================
-- TABLE LIEUX VISITÉS (module Carte)
-- à exécuter dans l'éditeur SQL Supabase
-- =====================================================

create table if not exists lieux_visites (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  latitude float not null,
  longitude float not null,
  annee int,
  created_at timestamptz default now()
);

-- RLS désactivé (accès via la clé anon, compte partagé)
alter table lieux_visites disable row level security;
