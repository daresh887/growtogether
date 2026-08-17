-- How long a contract holds you.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
--
-- duration_days is null for a lifetime contract, otherwise at least 30.
-- ends_at is computed from effective_at at lock-in time, and is null
-- for lifetime contracts.

alter table contracts
    add column if not exists duration_days int,
    add column if not exists ends_at timestamptz;

alter table contracts
    drop constraint if exists contracts_duration_min;

alter table contracts
    add constraint contracts_duration_min
    check (duration_days is null or duration_days >= 30);

create index if not exists contracts_ends_at_idx
    on contracts (ends_at)
    where status = 'active';
