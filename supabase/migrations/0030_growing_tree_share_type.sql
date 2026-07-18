-- Adds the fourth share format (see components/GrowingTree.tsx,
-- app/growing/page.tsx). Reuses the existing shares table, /r/[shareId]
-- page, and OG image pipeline unchanged; this is the only schema change
-- needed to support it, since a growing_tree share has no reference_id
-- (it's the sharer's own overall tree, not a specific badge/reflection).
alter type share_type add value 'growing_tree';
