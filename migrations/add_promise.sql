-- The promise you make to yourself when you sign: that you will commit and
-- you will not break the contract, in your own words. If you fail, it is
-- published on your page, quoted back at you.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

alter table contracts
    add column if not exists promise text not null default '';
