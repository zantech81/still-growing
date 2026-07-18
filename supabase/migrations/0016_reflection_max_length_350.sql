-- Update reflection max_length from 280 to 350 for all existing books
update public.books
  set gamification_config = jsonb_set(gamification_config, '{reflection,max_length}', '350');

-- Update the column default so new books also get 350
alter table public.books
  alter column gamification_config set default '{
    "mechanic": "badges",
    "badge_trigger": "claim_after_read",
    "reward_type": "video",
    "chapter_unlock": "sequential",
    "reflection": { "enabled": true, "required": false, "max_length": 350 }
  }';
