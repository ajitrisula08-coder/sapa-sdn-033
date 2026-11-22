-- =====================================================================
--  MASJID DARUSSALAM — Migration 5: nomor WA petugas (privat) & catatan pengingat
-- =====================================================================
-- Nomor WhatsApp petugas Jumat: DATA PRIBADI, hanya admin yang dapat membaca/mengubah.
create table public.officer_contacts (
  officer_id  uuid primary key references public.friday_officers (id) on delete cascade,
  whatsapp    text not null check (whatsapp ~ '^62[0-9]{8,13}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.officer_contacts is 'Nomor WhatsApp petugas Jumat (format 62xxxxxxxxxx). Privat: hanya administrator.';
create trigger officer_contacts_updated_at before update on public.officer_contacts
  for each row execute function public.set_updated_at();

-- Catatan pengingat yang sudah dikirim (agar admin tahu siapa yang sudah diingatkan).
create table public.friday_reminders (
  id           uuid primary key default gen_random_uuid(),
  schedule_id  uuid not null references public.friday_schedules (id) on delete cascade,
  role         text not null check (role in ('imam', 'khatib', 'bilal')),
  officer_id   uuid references public.friday_officers (id) on delete set null,
  channel      text not null default 'manual' check (channel in ('manual', 'otomatis')),
  sent_at      timestamptz not null default now(),
  sent_by      uuid references public.profiles (id) on delete set null default auth.uid()
);
create index friday_reminders_schedule_idx on public.friday_reminders (schedule_id, role);

alter table public.officer_contacts enable row level security;
alter table public.friday_reminders enable row level security;
revoke all on public.officer_contacts from anon;
revoke all on public.friday_reminders from anon;

create policy "kontak petugas: admin baca" on public.officer_contacts for select to authenticated using (public.is_admin());
create policy "kontak petugas: admin tambah" on public.officer_contacts for insert to authenticated with check (public.is_admin());
create policy "kontak petugas: admin ubah" on public.officer_contacts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "kontak petugas: admin hapus" on public.officer_contacts for delete to authenticated using (public.is_admin());

create policy "pengingat: admin baca" on public.friday_reminders for select to authenticated using (public.is_admin());
create policy "pengingat: admin tambah" on public.friday_reminders for insert to authenticated with check (public.is_admin());
