-- 043_memory_ttl_semantic.sql
-- Closes the PATCH-03 TTL gap in semantic recall. Migration 036 gave
-- cue_memory_notes an expires_at column and the API now enforces that TTL
-- everywhere else: the recency branch filters at the query
-- (expires_at.is.null,expires_at.gt.<now> in services/cue/memory/store.py) and
-- purge_expired_notes() deletes the rows on a sweep. The semantic branch was the
-- one hole. match_cue_memory_notes (migration 037) has no expires_at predicate
-- and returns neither the id nor expires_at, so an expired note could not be
-- filtered out from Python either. Until the purge sweep caught up, an expired
-- note could still surface in recall.
--
-- This is a CREATE OR REPLACE of match_cue_memory_notes with one line added to
-- the where clause and nothing else changed: same signature, same return shape,
-- same ordering, same security definer settings. A null expires_at stays
-- recallable, because those are legacy rows that predate the TTL, matching the recency
-- branch's treatment.
--
-- find_similar_cue_note (consolidation) is deliberately left alone; it is a
-- separate question and out of scope here.
--
-- Applies with the standard migration flow: run via the Supabase dashboard SQL
-- editor or the Supabase CLI, same as every other file in this directory.
-- Not applied as part of this change.

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
    and (n.expires_at is null or n.expires_at > now())
  order by n.embedding <=> p_query_embedding
  limit greatest(1, p_match_count);
$$;
