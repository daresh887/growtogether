-- TEST DATA — three fake signers so every interface has something to show:
-- one who FAILED (with wall comments), two still alive (with posts, likes,
-- and comments so the feed and the "popular" sort work).
--
-- RUN THIS IN YOUR SUPABASE SQL EDITOR,
-- AFTER add_contract_comments.sql (the wall needs that table)
-- AND add_promise.sql (contracts now carry a promise to yourself).
--
-- The fake accounts use @seed.local emails and cannot be logged into.
-- To remove everything this file created, run the DELETE at the bottom.

-- Refuse to run before the wall table exists, with a pointer instead of
-- a confusing insert error.
do $$
begin
    if to_regclass('public.contract_comments') is null then
        raise exception
            'contract_comments is missing — run add_contract_comments.sql first.';
    end if;
end $$;

begin;

-- ============================================
-- 1. Three fake people
-- ============================================
insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
) values
    ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'dereck@seed.local', '',
     now(), now() - interval '9 days', now(),
     '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
    ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'alex@seed.local', '',
     now(), now() - interval '6 days', now(),
     '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
    ('33333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000',
     'authenticated', 'authenticated', 'johan@seed.local', '',
     now(), now() - interval '4 days', now(),
     '{"provider":"email","providers":["email"]}', '{}', '', '', '', '')
on conflict (id) do nothing;

insert into profiles (id, display_name, avatar_url, bio) values
    ('11111111-1111-4111-8111-111111111111', 'Dereck Johnson',
     'https://i.pravatar.cc/600?img=12',
     'Building a SaaS to $10k MRR. No excuses this time.'),
    ('22222222-2222-4222-8222-222222222222', 'Alex Rivera',
     'https://i.pravatar.cc/600?img=32',
     'Powerlifter. Chasing a 200kg deadlift before the year ends.'),
    ('33333333-3333-4333-8333-333333333333', 'Johan Susuru',
     'https://i.pravatar.cc/600?img=56',
     'Writing my first novel, one chapter a week, in public.')
on conflict (id) do nothing;

-- ============================================
-- 2. Dereck: signed, posted three times, stopped. FAILED.
-- ============================================
insert into contracts (
    id, user_id, category, discipline, commitment, cadence, forfeit, promise,
    proof_description, photo_url, social_platform, social_handle, social_url,
    signer_name, signature_strokes, duration_days, ends_at,
    status, effective_at, breached_at, created_at
) values (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'build', 'indie hacking',
    'ship one meaningful improvement to my product every single day',
    'daily',
    'my name, my face, and everything on this contract will be published on the front page. Everyone will see that I quit',
    'I will not quit this time. I have abandoned every project I ever started and this contract is where that ends',
    'a screenshot of what I shipped, with a short note',
    'https://i.pravatar.cc/600?img=12',
    'x', 'dereckbuilds', 'https://x.com/dereckbuilds',
    'Dereck Johnson',
    '[[[12,64],[34,22],[57,66],[80,25],[102,60],[124,30]],[[140,48],[210,44],[262,50]]]',
    30, now() + interval '21 days',
    'breached', now() - interval '9 days', now() - interval '5 days', now() - interval '9 days'
);

insert into contract_events (contract_id, type, detail, created_at) values
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'signed', '', now() - interval '9 days'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'breach', 'missed the 24 hour window', now() - interval '5 days');

insert into checkins (id, contract_id, user_id, content, created_at) values
    ('aaaa0001-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
     '11111111-1111-4111-8111-111111111111',
     'Day 1. I''m Dereck, building a scheduling tool for barbers. Starting from 4 paying users. If I stop shipping, you all get to watch me eat my words.',
     now() - interval '9 days' + interval '2 hours'),
    ('aaaa0001-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
     '11111111-1111-4111-8111-111111111111',
     'Shipped the reminder emails. Two users asked for it, done in a day.',
     now() - interval '8 days'),
    ('aaaa0001-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
     '11111111-1111-4111-8111-111111111111',
     'Rough day. Only managed a small bugfix but it counts. Shipping is shipping.',
     now() - interval '7 days');

-- What people said to his face after he quit.
insert into contract_comments (id, contract_id, user_id, author_name, author_photo, content, parent_id, created_at) values
    ('cccc0001-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
     '22222222-2222-4222-8222-222222222222', 'Alex Rivera', 'https://i.pravatar.cc/600?img=32',
     'Three days. You wrote "no excuses this time" in your bio and lasted three days.', null,
     now() - interval '4 days'),
    ('cccc0001-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
     '33333333-3333-4333-8333-333333333333', 'Johan Susuru', 'https://i.pravatar.cc/600?img=56',
     'he even picked the punishment himself lmao', 'cccc0001-0000-4000-8000-000000000001',
     now() - interval '4 days' + interval '3 hours'),
    ('cccc0001-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
     '33333333-3333-4333-8333-333333333333', 'Johan Susuru', 'https://i.pravatar.cc/600?img=56',
     'The barbers deserved better, Dereck.', null,
     now() - interval '2 days');

-- ============================================
-- 3. Alex: alive and posting daily. Popular.
-- ============================================
insert into contracts (
    id, user_id, category, discipline, commitment, cadence, forfeit, promise,
    proof_description, photo_url, social_platform, social_handle, social_url,
    signer_name, signature_strokes, duration_days, ends_at,
    status, effective_at, created_at
) values (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'train', 'powerlifting',
    'train six days a week and log every single session until I pull 200kg',
    'daily',
    'my name, my face, and everything on this contract will be published on the front page. Everyone will see that I quit',
    'I will show up on the days I do not feel like it, because those are the only days that count',
    'a photo from the gym and the numbers I hit',
    'https://i.pravatar.cc/600?img=32',
    'instagram', 'alexlifts', 'https://instagram.com/alexlifts',
    'Alex Rivera',
    '[[[10,55],[42,18],[74,58]],[[30,42],[58,42]],[[92,20],[92,60],[122,60]]]',
    null, null,
    'active', now() - interval '6 days', now() - interval '6 days'
);

insert into checkins (id, contract_id, user_id, content, created_at) values
    ('bbbb0001-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
     '22222222-2222-4222-8222-222222222222',
     'Day 1. Alex, 24, powerlifting for three years but always skipping the boring work. Current deadlift 170kg. Target 200. Every session gets logged here.',
     now() - interval '6 days' + interval '1 hour'),
    ('bbbb0001-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
     '22222222-2222-4222-8222-222222222222',
     'Squats 5x5 at 140kg, then the accessory work I usually skip. All of it.',
     now() - interval '5 days'),
    ('bbbb0001-0000-4000-8000-000000000003', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
     '22222222-2222-4222-8222-222222222222',
     'Deadlift day. 180kg x1 — a 10kg PR. This contract thing might actually work.',
     now() - interval '3 days'),
    ('bbbb0001-0000-4000-8000-000000000004', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
     '22222222-2222-4222-8222-222222222222',
     'Bench and rows. Nothing heroic, just showed up. That''s the whole point.',
     now() - interval '10 hours');

insert into checkin_reactions (checkin_id, user_id, value, created_at) values
    ('bbbb0001-0000-4000-8000-000000000003', '33333333-3333-4333-8333-333333333333', 1, now() - interval '2 days'),
    ('bbbb0001-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 1, now() - interval '2 days'),
    ('bbbb0001-0000-4000-8000-000000000004', '33333333-3333-4333-8333-333333333333', 1, now() - interval '5 hours'),
    ('bbbb0001-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 1, now() - interval '5 days');

insert into checkin_comments (id, checkin_id, user_id, author_name, author_photo, content, parent_id, created_at) values
    ('dddd0001-0000-4000-8000-000000000001', 'bbbb0001-0000-4000-8000-000000000003',
     '33333333-3333-4333-8333-333333333333', 'Johan Susuru', 'https://i.pravatar.cc/600?img=56',
     '10kg PR in week one is wild. The accountability is working', null, now() - interval '2 days'),
    ('dddd0001-0000-4000-8000-000000000002', 'bbbb0001-0000-4000-8000-000000000003',
     '22222222-2222-4222-8222-222222222222', 'Alex Rivera', 'https://i.pravatar.cc/600?img=32',
     'knowing you all are watching is worth 10kg on its own', 'dddd0001-0000-4000-8000-000000000001',
     now() - interval '2 days' + interval '1 hour');

-- ============================================
-- 4. Johan: alive, writing.
-- ============================================
insert into contracts (
    id, user_id, category, discipline, commitment, cadence, forfeit, promise,
    proof_description, photo_url, social_platform, social_handle, social_url,
    signer_name, signature_strokes, duration_days, ends_at,
    status, effective_at, created_at
) values (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    '33333333-3333-4333-8333-333333333333',
    'create', 'writing a novel',
    'write at least 500 words of my novel every single day',
    'daily',
    'my name, my face, and everything on this contract will be published on the front page. Everyone will see that I quit',
    'I will finish this book even if every page fights me. Four false starts is enough',
    'a photo of the day''s pages with the word count',
    'https://i.pravatar.cc/600?img=56',
    'x', 'johanwrites', 'https://x.com/johanwrites',
    'Johan Susuru',
    '[[[14,50],[14,20],[40,20],[40,62],[14,62]],[[60,30],[60,60],[86,60],[86,30]]]',
    90, now() + interval '86 days',
    'active', now() - interval '4 days', now() - interval '4 days'
);

insert into checkins (id, contract_id, user_id, content, created_at) values
    ('ffff0001-0000-4000-8000-000000000001', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
     '33333333-3333-4333-8333-333333333333',
     'Day 1. Johan. I''ve started this novel four times in three years and never passed chapter two. 500 words a day, here, in public, until it''s done.',
     now() - interval '4 days' + interval '2 hours'),
    ('ffff0001-0000-4000-8000-000000000002', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
     '33333333-3333-4333-8333-333333333333',
     '640 words. Chapter two, for the first time in my life. The fear of that red stamp is a better editor than I am.',
     now() - interval '1 day');

insert into checkin_reactions (checkin_id, user_id, value, created_at) values
    ('ffff0001-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 1, now() - interval '20 hours');

commit;

-- Sanity check: 3 users, 3 contracts (1 failed), 9 posts, 3 wall comments.
select 'users' as what, count(*) from auth.users where email like '%@seed.local'
union all select 'contracts', count(*) from contracts
union all select 'failed', count(*) from contracts where status = 'breached'
union all select 'posts', count(*) from checkins
union all select 'wall comments', count(*) from contract_comments;

-- ============================================
-- TO REMOVE THE TEST DATA LATER, run just this:
--   delete from auth.users where email like '%@seed.local';
-- Everything else cascades from the users.
-- ============================================
