-- The real Systeme.io sales page URL can't be derived from the book slug
-- (it needs a specific path Systeme.io assigns, e.g.
-- baby.stillgrowing.co/XXXX), so it has to be admin-entered rather than
-- guessed. Nullable: /r/[shareId] hides the CTA entirely when unset
-- rather than link to a guessed/broken URL.
alter table public.books
  add column sales_page_url text;
