-- Dedicated landscape banner (1376x786, tablet-mockup-in-a-room scene) for
-- the /r/[shareId] share landing page ONLY. Deliberately a separate column
-- from both cover_image_url (Library thumbnail) and banner_image_url (the
-- Journey page's portrait book cover): those two must stay exactly as
-- they are; reusing either for this differently-shaped image would either
-- stretch/crop it or repurpose an asset readers already see elsewhere for
-- a different aspect ratio and audience.
alter table public.books
  add column share_banner_image_url text;
