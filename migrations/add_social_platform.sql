-- Structured social links on contracts.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
--
-- social_url stays as the resolved link. These two columns record how it
-- was entered, so the record can show "X @darius" instead of a raw URL.

alter table contracts
    add column if not exists social_platform text not null default '',
    add column if not exists social_handle text not null default '';
