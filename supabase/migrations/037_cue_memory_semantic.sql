-- 037_cue_memory_semantic.sql — Phase 25 Slice 2: semantic recall + consolidation.
-- Adds the vector index and two RPCs the backend calls via supabase.rpc(...).
-- All scoped by p_physician_id (CUE-11). Service-role calls these (RLS bypassed).

create index if not exists idx_cue_memory_notes_embedding
  on cue_memory_notes using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Recall: the nearest notes to a query embedding, scoped to the physician,
-- skipping notes that have not been embedded yet (those are reached by the
-- recency fallback in the backend). Distance is cosine (0 = identical, 2 = opposite).
create or replace function match_cue_memory_notes(
  p_physician_id uuid,
  p_query_embedding vector(1536),
  p_match_count int default 10
)
returns table (note text, appended_at timestamptz, category text, distance float)
language sql
stable
security definer
set search_path = public
as $$
  select n.note, n.appended_at, n.category,
         (n.embedding <=> p_query_embedding) as distance
  from cue_memory_notes n
  where n.physician_id = p_physician_id
    and n.embedding is not null
  order by n.embedding <=> p_query_embedding
  limit greatest(1, p_match_count);
$$;

-- Consolidation: the single nearest same-category note within a tight distance
-- threshold (a near-duplicate). The backend updates that note instead of inserting
-- a new one, so the profile stays a living picture rather than an append log.
create or replace function find_similar_cue_note(
  p_physician_id uuid,
  p_embedding vector(1536),
  p_category text,
  p_max_distance float default 0.15
)
returns table (id uuid, salience smallint, distance float)
language sql
stable
security definer
set search_path = public
as $$
  select n.id, n.salience, (n.embedding <=> p_embedding) as distance
  from cue_memory_notes n
  where n.physician_id = p_physician_id
    and n.category = p_category
    and n.embedding is not null
    and (n.embedding <=> p_embedding) <= p_max_distance
  order by n.embedding <=> p_embedding
  limit 1;
$$;
