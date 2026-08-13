-- Per-chapter Mux video thumbnail frame offset, in seconds (e.g. 0.26),
-- passed as MuxPlayer's thumbnailTime prop so the reward-claim video
-- poster shows a deliberately chosen frame instead of Mux's own default
-- (often a black/loading frame at time=0). Nullable: falls back to
-- MuxPlayer's own default when unset. double precision, not numeric, so
-- Supabase JS/PostgREST returns it as a real JS number, not a string.
alter table public.chapters add column thumbnail_time double precision;
