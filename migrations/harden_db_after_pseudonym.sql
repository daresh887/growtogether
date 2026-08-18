-- HARDENING, for a database that already ran add_pseudonymous_identity.sql.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR.
--
-- Use this file INSTEAD OF harden_db.sql if the sealed-identity migration
-- has already been applied. harden_db.sql was written against the older
-- schema: it constrains contracts.signer_name, photo_url, social_url,
-- social_handle and signature_strokes, all of which the pseudonym
-- migration moved into contract_identity and dropped from contracts. Run
-- it now and it fails on the first of them:
--
--     ERROR: 42703: column "signer_name" does not exist
--
-- Nothing is wrong with your database — the file is simply from before the
-- split. Everything harden_db.sql was protecting is still protected here:
-- the limits on the sealed columns moved with them and are already declared
-- on contract_identity, and the author trigger reads the username instead
-- of the sealed name. What remains is restated below in its current form.
--
-- Safe to run more than once: every constraint is dropped before it is
-- added, and every policy, function and trigger is replaced outright.
--
-- If an ADD CONSTRAINT fails on existing data, a row already breaks that
-- limit. Find it with the check inverted, e.g.
--     select id, char_length(commitment) from contracts
--     where char_length(commitment) > 500;
-- then fix or delete the row and run this again.

-- ============================================
-- 1. A contract can only be born live.
--    Without this, a signed-in user could insert a row with
--    status='breached' and any name and face on it — putting an arbitrary
--    person on the losers wall without them ever signing anything.
-- ============================================
drop policy if exists "contracts_insert_own" on contracts;
create policy "contracts_insert_own" on contracts
    for insert to authenticated with check (
        auth.uid() = user_id
        and status = 'active'
        and breached_at is null
        and resolved_at is null
    );

-- ============================================
-- 2. The wall only opens once the contract is actually failed.
--    The server action already refuses; now the table does too.
-- ============================================
drop policy if exists "contract_comments_insert_own" on contract_comments;
create policy "contract_comments_insert_own" on contract_comments
    for insert to authenticated with check (
        auth.uid() = user_id
        and exists (
            select 1 from contracts c
            where c.id = contract_id and c.status = 'breached'
        )
    );

-- ============================================
-- 3. Text limits, enforced by the table.
--    The server actions validate all of these; the constraints make the
--    limits real for writes that never pass through the actions.
--
--    The signer's name, face and signature are absent here on purpose:
--    they live on contract_identity now, and that table declares its own
--    real_name / face_path / signature_strokes limits at creation.
-- ============================================
alter table contracts
    drop constraint if exists contracts_discipline_len,
    drop constraint if exists contracts_commitment_len,
    drop constraint if exists contracts_proof_len,
    drop constraint if exists contracts_forfeit_len,
    drop constraint if exists contracts_promise_len,
    drop constraint if exists contracts_timezone_len;

alter table contracts
    add constraint contracts_discipline_len check (char_length(discipline) <= 40),
    add constraint contracts_commitment_len check (char_length(commitment) <= 500),
    add constraint contracts_proof_len check (char_length(proof_description) <= 200),
    add constraint contracts_forfeit_len check (char_length(forfeit) <= 500),
    add constraint contracts_promise_len check (char_length(promise) <= 300),
    add constraint contracts_timezone_len check (char_length(timezone) <= 64);

alter table checkins
    drop constraint if exists checkins_content_len,
    drop constraint if exists checkins_images_count;

alter table checkins
    add constraint checkins_content_len check (char_length(content) <= 2000),
    add constraint checkins_images_count check (cardinality(images) <= 4);

alter table checkin_comments
    drop constraint if exists checkin_comments_content_len,
    drop constraint if exists checkin_comments_author_len,
    drop constraint if exists checkin_comments_photo_len;

alter table checkin_comments
    add constraint checkin_comments_content_len check (char_length(content) <= 500),
    add constraint checkin_comments_author_len check (char_length(author_name) <= 80),
    add constraint checkin_comments_photo_len check (char_length(author_photo) <= 500);

alter table contract_comments
    drop constraint if exists contract_comments_content_len,
    drop constraint if exists contract_comments_author_len,
    drop constraint if exists contract_comments_photo_len;

alter table contract_comments
    add constraint contract_comments_content_len check (char_length(content) <= 500),
    add constraint contract_comments_author_len check (char_length(author_name) <= 80),
    add constraint contract_comments_photo_len check (char_length(author_photo) <= 500);

alter table profiles
    drop constraint if exists profiles_bio_len,
    drop constraint if exists profiles_name_len,
    drop constraint if exists profiles_avatar_len;

alter table profiles
    add constraint profiles_bio_len check (char_length(bio) <= 300),
    add constraint profiles_name_len check (char_length(coalesce(display_name, '')) <= 80),
    add constraint profiles_avatar_len check (char_length(coalesce(avatar_url, '')) <= 500);

-- ============================================
-- 4. You are who you are, and it happened when it happened.
--    Comments carry a snapshot of the author's name and photo, and every
--    timestamp feeds the clock, the streaks, and the popular sort. All of
--    them were client-writable through the API. This trigger overwrites
--    the author snapshot from the caller's own records and pins created_at
--    to the server clock. It skips rows written without a user JWT (the
--    SQL editor, the service role), so seeds and the enforcement engine
--    are unaffected.
--
--    The snapshot is taken from the profile — the username and the public
--    avatar. Never from the contract: the name signed there is sealed, and
--    reading it here would publish it under every comment they ever wrote.
--    This is the same function add_pseudonymous_identity.sql installs; the
--    triggers that call it are created here, which is why this section
--    still has to run.
-- ============================================
create or replace function public.stamp_comment_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_name text;
    v_photo text;
begin
    if auth.uid() is null then
        return new; -- service role / SQL editor: trusted paths keep their values
    end if;

    new.created_at := now();

    select p.username, p.avatar_url into v_name, v_photo
    from profiles p
    where p.id = auth.uid();

    new.author_name := coalesce(nullif(v_name, ''), 'someone');
    new.author_photo := coalesce(v_photo, '');
    return new;
end;
$$;

drop trigger if exists stamp_author_checkin_comments on checkin_comments;
create trigger stamp_author_checkin_comments
    before insert on checkin_comments
    for each row execute function public.stamp_comment_author();

drop trigger if exists stamp_author_contract_comments on contract_comments;
create trigger stamp_author_contract_comments
    before insert on contract_comments
    for each row execute function public.stamp_comment_author();

-- Posts and reactions: pin the clock the same way. Backdated posts would
-- forge streaks and day numbers; backdated likes would game the popular sort.
create or replace function public.stamp_created_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is not null then
        new.created_at := now();
    end if;
    return new;
end;
$$;

drop trigger if exists stamp_time_checkins on checkins;
create trigger stamp_time_checkins
    before insert on checkins
    for each row execute function public.stamp_created_at();

drop trigger if exists stamp_time_reactions on checkin_reactions;
create trigger stamp_time_reactions
    before insert on checkin_reactions
    for each row execute function public.stamp_created_at();
