-- Lock-in identity and proof terms on contracts.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
--
-- The contract snapshots the signer's identity at the moment they lock
-- in: full name (already in signer_name), a photo of them, and their
-- social media. It also records exactly what they will post as proof.

alter table contracts
    add column if not exists proof_description text not null default '',
    add column if not exists photo_url text not null default '',
    add column if not exists social_url text not null default '';
