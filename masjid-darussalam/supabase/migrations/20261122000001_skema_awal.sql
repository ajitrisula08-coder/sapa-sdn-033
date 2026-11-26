-- =====================================================================
--  MASJID DARUSSALAM — Sistem Informasi dan Administrasi Masjid
--  Migration 1: skema database, keamanan (RLS), audit log, dan fungsi
--
--  Cara menjalankan: buka Supabase Dashboard > SQL Editor > New query,
--  tempel seluruh isi file ini, lalu klik "Run".
--  File ini aman dijalankan satu kali pada project Supabase yang baru.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 0. Fungsi bantu umum
-- ---------------------------------------------------------------------

-- Mengisi kolom updated_at secara otomatis setiap kali baris diubah.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. PROFILES — data akun (hanya satu administrator)
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default 'Administrator'
              check (char_length(full_name) between 2 and 100),
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'Profil akun Supabase Auth. Hanya SATU akun boleh is_admin = true.';

-- Menjamin hanya ada satu administrator di seluruh sistem.
create unique index profiles_single_admin on public.profiles (is_admin) where is_admin;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Profil dibuat otomatis ketika akun baru dibuat di Supabase Auth.
-- Akun baru TIDAK otomatis menjadi admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'Administrator'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Apakah pengguna yang sedang login adalah administrator?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin
  );
$$;

-- Admin tidak boleh mengubah status is_admin dirinya/orang lain lewat aplikasi.
create or replace function public.protect_profile_admin_flag()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_admin is distinct from old.is_admin and auth.role() <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Status administrator hanya dapat diubah melalui SQL Editor Supabase.';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_admin before update on public.profiles
  for each row execute function public.protect_profile_admin_flag();

-- ---------------------------------------------------------------------
-- 2. AUDIT LOGS — jejak seluruh perubahan data penting
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  record_id   text not null,
  action      text not null check (action in ('INSERT', 'UPDATE', 'VOID', 'DELETE')),
  old_data    jsonb,
  new_data    jsonb,
  reason      text,
  changed_by  uuid references public.profiles (id) on delete set null,
  changed_at  timestamptz not null default now()
);
comment on table public.audit_logs is 'Riwayat perubahan. Hanya dapat ditulis oleh trigger database, tidak dapat diubah/dihapus dari aplikasi.';
create index audit_logs_table_record_idx on public.audit_logs (table_name, record_id);
create index audit_logs_changed_at_idx on public.audit_logs (changed_at desc);

-- Trigger audit generik. Alasan perubahan diambil dari kolom change_reason
-- (jika tabel memilikinya), kemudian kolom itu tidak ikut disimpan.
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text := tg_op;
  v_old jsonb;
  v_new jsonb;
  v_id text;
  v_reason text;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := to_jsonb(new); end if;
  v_id := coalesce(v_new ->> 'id', v_old ->> 'id');
  v_reason := coalesce(v_new ->> 'change_reason', null);

  if tg_table_name = 'transactions' and tg_op = 'UPDATE'
     and (v_old ->> 'status') = 'aktif' and (v_new ->> 'status') = 'dibatalkan' then
    v_action := 'VOID';
    v_reason := v_new ->> 'void_reason';
  end if;

  -- Abaikan update yang tidak mengubah apa pun selain updated_at.
  if tg_op = 'UPDATE' and (v_old - 'updated_at' - 'change_reason') = (v_new - 'updated_at' - 'change_reason') then
    return new;
  end if;

  insert into public.audit_logs (table_name, record_id, action, old_data, new_data, reason, changed_by)
  values (tg_table_name, v_id, v_action, v_old - 'change_reason', v_new - 'change_reason', v_reason, auth.uid());

  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------
-- 3. MOSQUE SETTINGS — identitas masjid & pengaturan jadwal salat
--    (satu baris saja, id = 1)
-- ---------------------------------------------------------------------
create table public.mosque_settings (
  id                    smallint primary key default 1 check (id = 1),
  name                  text not null default 'Masjid Darussalam' check (char_length(name) between 3 and 100),
  subtitle              text not null default 'Sistem Informasi dan Administrasi Masjid',
  address               text not null default 'Desa Teratak',
  district              text not null default 'Kecamatan Muara Kaman',
  regency               text not null default 'Kabupaten Kutai Kartanegara',
  province              text not null default 'Kalimantan Timur',
  logo_url              text check (logo_url is null or logo_url ~* '^(https://|/)'),
  -- Koordinat masjid. Nilai awal adalah titik PERKIRAAN Kecamatan Muara Kaman.
  -- Wajib diperbarui oleh admin dengan koordinat tepat masjid (dari Google Maps).
  latitude              numeric(9, 6) not null default -0.063600 check (latitude between -90 and 90),
  longitude             numeric(9, 6) not null default 116.861400 check (longitude between -180 and 180),
  coordinates_verified  boolean not null default false,
  timezone              text not null default 'Asia/Makassar' check (timezone in ('Asia/Makassar', 'Asia/Jakarta', 'Asia/Jayapura')),
  calc_method           text not null default 'KEMENAG'
                        check (calc_method in ('KEMENAG', 'MWL', 'EGYPTIAN', 'UMM_AL_QURA', 'SINGAPORE', 'ISNA')),
  madhab                text not null default 'SYAFII' check (madhab in ('SYAFII', 'HANAFI')),
  adj_subuh             smallint not null default 0 check (adj_subuh between -30 and 30),
  adj_terbit            smallint not null default 0 check (adj_terbit between -30 and 30),
  adj_zuhur             smallint not null default 0 check (adj_zuhur between -30 and 30),
  adj_asar              smallint not null default 0 check (adj_asar between -30 and 30),
  adj_magrib            smallint not null default 0 check (adj_magrib between -30 and 30),
  adj_isya              smallint not null default 0 check (adj_isya between -30 and 30),
  hijri_offset          smallint not null default 0 check (hijri_offset between -3 and 3),
  -- Saldo awal kas saat aplikasi mulai digunakan (diisi admin, bukan data contoh).
  opening_balance       numeric(15, 2) not null default 0 check (opening_balance >= 0),
  opening_balance_date  date,
  friday_default_time   time not null default '12:00',
  ramadan_mode          boolean not null default false,
  tv_running_text       text check (tv_running_text is null or char_length(tv_running_text) <= 500),
  change_reason         text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
comment on table public.mosque_settings is 'Identitas masjid, lokasi, metode & koreksi jadwal salat, saldo awal kas. Selalu satu baris (id=1).';

create trigger mosque_settings_updated_at before update on public.mosque_settings
  for each row execute function public.set_updated_at();
create trigger mosque_settings_audit after update on public.mosque_settings
  for each row execute function public.write_audit_log();

insert into public.mosque_settings (id) values (1);

-- ---------------------------------------------------------------------
-- 4. PRAYER SCHEDULES — jadwal salat manual (menimpa hasil perhitungan)
-- ---------------------------------------------------------------------
create table public.prayer_schedules (
  id             uuid primary key default gen_random_uuid(),
  schedule_date  date not null unique,
  subuh          time,
  terbit         time,
  zuhur          time,
  asar           time,
  magrib         time,
  isya           time,
  note           text check (note is null or char_length(note) <= 300),
  change_reason  text,
  created_by     uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint prayer_schedules_some_time check (
    coalesce(subuh, terbit, zuhur, asar, magrib, isya) is not null
  ),
  constraint prayer_schedules_order check (
    (subuh is null or zuhur is null or subuh < zuhur) and
    (zuhur is null or asar is null or zuhur < asar) and
    (asar is null or magrib is null or asar < magrib) and
    (magrib is null or isya is null or magrib < isya)
  )
);
comment on table public.prayer_schedules is 'Jadwal manual per tanggal. Kolom kosong (NULL) berarti memakai hasil perhitungan otomatis.';

create trigger prayer_schedules_updated_at before update on public.prayer_schedules
  for each row execute function public.set_updated_at();
create trigger prayer_schedules_audit after insert or update or delete on public.prayer_schedules
  for each row execute function public.write_audit_log();

-- ---------------------------------------------------------------------
-- 5. FRIDAY OFFICERS & FRIDAY SCHEDULES — petugas & jadwal salat Jumat
-- ---------------------------------------------------------------------
create table public.friday_officers (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null check (char_length(btrim(full_name)) between 2 and 100),
  roles       text[] not null default '{}'
              check (roles <@ array['imam', 'khatib', 'bilal', 'muazin']::text[]),
  notes       text check (notes is null or char_length(notes) <= 300),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index friday_officers_name_uq on public.friday_officers (lower(btrim(full_name)));
create trigger friday_officers_updated_at before update on public.friday_officers
  for each row execute function public.set_updated_at();
create trigger friday_officers_audit after insert or update or delete on public.friday_officers
  for each row execute function public.write_audit_log();

create table public.friday_schedules (
  id            uuid primary key default gen_random_uuid(),
  friday_date   date not null unique check (extract(isodow from friday_date) = 5),
  start_time    time not null default '12:00',
  imam_id       uuid references public.friday_officers (id) on delete restrict,
  khatib_id     uuid references public.friday_officers (id) on delete restrict,
  bilal_id      uuid references public.friday_officers (id) on delete restrict,
  muazin_id     uuid references public.friday_officers (id) on delete restrict,
  sermon_theme  text check (sermon_theme is null or char_length(sermon_theme) <= 200),
  notes         text check (notes is null or char_length(notes) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.friday_schedules is 'Jadwal salat Jumat per pekan. Tanggal wajib hari Jumat.';
create index friday_schedules_date_idx on public.friday_schedules (friday_date desc);
create index friday_schedules_imam_idx on public.friday_schedules (imam_id);
create index friday_schedules_khatib_idx on public.friday_schedules (khatib_id);
create index friday_schedules_bilal_idx on public.friday_schedules (bilal_id);
create index friday_schedules_muazin_idx on public.friday_schedules (muazin_id);
create trigger friday_schedules_updated_at before update on public.friday_schedules
  for each row execute function public.set_updated_at();
create trigger friday_schedules_audit after insert or update or delete on public.friday_schedules
  for each row execute function public.write_audit_log();

-- Petugas yang dipilih harus memiliki peran yang sesuai.
create or replace function public.validate_friday_roles()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.imam_id is not null and not exists (select 1 from public.friday_officers o where o.id = new.imam_id and 'imam' = any (o.roles)) then
    raise exception 'Petugas yang dipilih sebagai imam belum memiliki peran imam.';
  end if;
  if new.khatib_id is not null and not exists (select 1 from public.friday_officers o where o.id = new.khatib_id and 'khatib' = any (o.roles)) then
    raise exception 'Petugas yang dipilih sebagai khatib belum memiliki peran khatib.';
  end if;
  if new.bilal_id is not null and not exists (select 1 from public.friday_officers o where o.id = new.bilal_id and 'bilal' = any (o.roles)) then
    raise exception 'Petugas yang dipilih sebagai bilal belum memiliki peran bilal.';
  end if;
  if new.muazin_id is not null and not exists (select 1 from public.friday_officers o where o.id = new.muazin_id and 'muazin' = any (o.roles)) then
    raise exception 'Petugas yang dipilih sebagai muazin belum memiliki peran muazin.';
  end if;
  return new;
end;
$$;
create trigger friday_schedules_validate before insert or update on public.friday_schedules
  for each row execute function public.validate_friday_roles();

-- ---------------------------------------------------------------------
-- 6. TRANSACTION CATEGORIES & TRANSACTIONS — keuangan masjid
-- ---------------------------------------------------------------------
create table public.transaction_categories (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('pemasukan', 'pengeluaran')),
  name        text not null check (char_length(btrim(name)) between 2 and 60),
  slug        text not null unique check (slug ~ '^[a-z0-9_]+$'),
  sort_order  smallint not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger transaction_categories_updated_at before update on public.transaction_categories
  for each row execute function public.set_updated_at();
create trigger transaction_categories_audit after insert or update or delete on public.transaction_categories
  for each row execute function public.write_audit_log();

insert into public.transaction_categories (type, name, slug, sort_order) values
  ('pemasukan',   'Infak Jumat',          'infak_jumat',        1),
  ('pemasukan',   'Infak Harian',         'infak_harian',       2),
  ('pemasukan',   'Sedekah Jamaah',       'sedekah_jamaah',     3),
  ('pemasukan',   'Sumbangan Donatur',    'sumbangan_donatur',  4),
  ('pemasukan',   'Bantuan Pemerintah',   'bantuan_pemerintah', 5),
  ('pemasukan',   'Pemasukan Lainnya',    'pemasukan_lainnya',  6),
  ('pengeluaran', 'Listrik',              'listrik',            1),
  ('pengeluaran', 'Air',                  'air',                2),
  ('pengeluaran', 'Kebersihan',           'kebersihan',         3),
  ('pengeluaran', 'Pemeliharaan Masjid',  'pemeliharaan',       4),
  ('pengeluaran', 'Honor Petugas',        'honor_petugas',      5),
  ('pengeluaran', 'Kegiatan Keagamaan',   'kegiatan_keagamaan', 6),
  ('pengeluaran', 'Kegiatan Sosial',      'kegiatan_sosial',    7),
  ('pengeluaran', 'Pengeluaran Lainnya',  'pengeluaran_lainnya',8);

create sequence public.transaction_number_seq;

create table public.transactions (
  id                uuid primary key default gen_random_uuid(),
  trx_number        text not null unique,
  trx_date          date not null,
  type              text not null check (type in ('pemasukan', 'pengeluaran')),
  category_id       uuid not null references public.transaction_categories (id) on delete restrict,
  description       text not null check (char_length(btrim(description)) between 3 and 300),
  amount            numeric(15, 2) not null check (amount > 0 and amount <= 10000000000),
  -- Nama donatur bersifat pribadi: hanya tampil ke publik jika donor_is_public = true.
  donor_name        text check (donor_name is null or char_length(donor_name) <= 100),
  donor_is_public   boolean not null default false,
  proof_path        text check (proof_path is null or char_length(proof_path) <= 300),
  recorded_by       uuid references public.profiles (id) on delete set null default auth.uid(),
  recorded_by_name  text,
  status            text not null default 'aktif' check (status in ('aktif', 'dibatalkan')),
  void_reason       text,
  voided_at         timestamptz,
  voided_by         uuid references public.profiles (id) on delete set null,
  change_reason     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint transactions_void_consistency check (
    (status = 'aktif' and void_reason is null and voided_at is null)
    or (status = 'dibatalkan' and char_length(btrim(coalesce(void_reason, ''))) >= 5 and voided_at is not null)
  )
);
comment on table public.transactions is 'Transaksi kas masjid. Tidak dapat dihapus; pembatalan memakai status "dibatalkan" + alasan, tercatat di audit_logs.';
comment on column public.transactions.change_reason is 'Alasan perubahan terakhir (wajib saat edit), disalin ke audit_logs.';
create index transactions_date_idx on public.transactions (trx_date desc, created_at desc);
create index transactions_category_idx on public.transactions (category_id);
create index transactions_type_status_idx on public.transactions (type, status);
create index transactions_desc_search_idx on public.transactions using gin (to_tsvector('simple', description));

create or replace function public.transactions_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cat_type text;
  v_open_date date;
begin
  select c.type into v_cat_type from public.transaction_categories c where c.id = new.category_id;
  if v_cat_type is null then
    raise exception 'Kategori transaksi tidak ditemukan.';
  end if;
  if v_cat_type <> new.type then
    raise exception 'Kategori "%" tidak sesuai dengan jenis transaksi %.', new.category_id, new.type;
  end if;

  select s.opening_balance_date into v_open_date from public.mosque_settings s where s.id = 1;
  if v_open_date is not null and new.trx_date < v_open_date then
    raise exception 'Tanggal transaksi tidak boleh sebelum tanggal saldo awal (%).', v_open_date;
  end if;
  if new.trx_date > (now() at time zone 'Asia/Makassar')::date + 1 then
    raise exception 'Tanggal transaksi tidak boleh di masa depan.';
  end if;

  new.description := btrim(new.description);
  new.donor_name := nullif(btrim(coalesce(new.donor_name, '')), '');
  if new.donor_name is null then new.donor_is_public := false; end if;

  if tg_op = 'INSERT' then
    new.status := 'aktif';
    new.void_reason := null;
    new.voided_at := null;
    new.voided_by := null;
    new.recorded_by := coalesce(auth.uid(), new.recorded_by);
    new.created_at := now();
    new.trx_number := case new.type when 'pemasukan' then 'PM' else 'PK' end
                      || '-' || to_char(new.trx_date, 'YYYYMM')
                      || '-' || lpad(nextval('public.transaction_number_seq')::text, 5, '0');
    select p.full_name into new.recorded_by_name from public.profiles p where p.id = new.recorded_by;
    new.change_reason := null;
  else
    -- Kolom identitas transaksi tidak boleh diubah.
    new.trx_number := old.trx_number;
    new.recorded_by := old.recorded_by;
    new.recorded_by_name := old.recorded_by_name;
    new.created_at := old.created_at;

    if old.status = 'dibatalkan' then
      raise exception 'Transaksi % sudah dibatalkan dan tidak dapat diubah lagi.', old.trx_number;
    end if;

    if new.status = 'dibatalkan' then
      -- Pembatalan: hanya status & alasan yang berubah.
      if char_length(btrim(coalesce(new.void_reason, ''))) < 5 then
        raise exception 'Alasan pembatalan wajib diisi (minimal 5 karakter).';
      end if;
      new.trx_date := old.trx_date;
      new.type := old.type;
      new.category_id := old.category_id;
      new.description := old.description;
      new.amount := old.amount;
      new.donor_name := old.donor_name;
      new.donor_is_public := old.donor_is_public;
      new.void_reason := btrim(new.void_reason);
      new.voided_at := now();
      new.voided_by := auth.uid();
    else
      if char_length(btrim(coalesce(new.change_reason, ''))) < 5 then
        raise exception 'Alasan perubahan transaksi wajib diisi (minimal 5 karakter).';
      end if;
      new.void_reason := null;
      new.voided_at := null;
      new.voided_by := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger transactions_before_write before insert or update on public.transactions
  for each row execute function public.transactions_before_write();
create trigger transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
create trigger transactions_audit after insert or update on public.transactions
  for each row execute function public.write_audit_log();

-- Transaksi keuangan TIDAK PERNAH boleh dihapus permanen.
create or replace function public.prevent_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Data % tidak boleh dihapus. Gunakan fitur pembatalan dengan alasan.', tg_table_name;
end;
$$;
create trigger transactions_no_delete before delete on public.transactions
  for each row execute function public.prevent_delete();
create trigger audit_logs_no_delete before delete or update on public.audit_logs
  for each row execute function public.prevent_delete();

-- ---------------------------------------------------------------------
-- 7. ANNOUNCEMENTS — pengumuman
-- ---------------------------------------------------------------------
create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(btrim(title)) between 3 and 150),
  content     text not null check (char_length(btrim(content)) between 3 and 5000),
  category    text not null default 'lainnya'
              check (category in ('kegiatan', 'berita_duka', 'gotong_royong', 'infak', 'penting', 'lainnya')),
  is_pinned   boolean not null default false,
  status      text not null default 'terbit' check (status in ('terbit', 'arsip')),
  publish_at  timestamptz not null default now(),
  expires_at  timestamptz,
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint announcements_expiry check (expires_at is null or expires_at > publish_at)
);
create index announcements_status_publish_idx on public.announcements (status, is_pinned desc, publish_at desc);
create trigger announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();
create trigger announcements_audit after insert or update or delete on public.announcements
  for each row execute function public.write_audit_log();

-- ---------------------------------------------------------------------
-- 8. ACTIVITIES — agenda kegiatan
-- ---------------------------------------------------------------------
create table public.activities (
  id             uuid primary key default gen_random_uuid(),
  title          text not null check (char_length(btrim(title)) between 3 and 150),
  description    text check (description is null or char_length(description) <= 3000),
  category       text not null default 'lainnya'
                 check (category in ('pengajian', 'ceramah', 'ramadan', 'idulfitri', 'iduladha', 'sosial', 'gotong_royong', 'lainnya')),
  activity_date  date not null,
  start_time     time not null,
  end_time       time,
  location       text check (location is null or char_length(location) <= 150),
  status         text not null default 'terjadwal' check (status in ('terjadwal', 'berlangsung', 'selesai', 'dibatalkan')),
  created_by     uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint activities_time_order check (end_time is null or end_time > start_time)
);
create index activities_date_idx on public.activities (activity_date, start_time);
create trigger activities_updated_at before update on public.activities
  for each row execute function public.set_updated_at();
create trigger activities_audit after insert or update or delete on public.activities
  for each row execute function public.write_audit_log();

-- ---------------------------------------------------------------------
-- 9. INVENTORIES — inventaris masjid
-- ---------------------------------------------------------------------
create table public.inventories (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(btrim(name)) between 2 and 120),
  category       text not null default 'lainnya'
                 check (category in ('perlengkapan_ibadah', 'elektronik', 'furnitur', 'kebersihan', 'buku', 'lainnya')),
  quantity       integer not null default 1 check (quantity between 0 and 100000),
  unit           text not null default 'buah' check (char_length(unit) between 1 and 20),
  condition      text not null default 'baik' check (condition in ('baik', 'rusak_ringan', 'rusak_berat', 'hilang')),
  purchase_date  date,
  notes          text check (notes is null or char_length(notes) <= 500),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index inventories_name_idx on public.inventories (lower(name));
create trigger inventories_updated_at before update on public.inventories
  for each row execute function public.set_updated_at();
create trigger inventories_audit after insert or update or delete on public.inventories
  for each row execute function public.write_audit_log();

-- ---------------------------------------------------------------------
-- 10. VIEW & FUNGSI KEUANGAN PUBLIK
--     Saldo TIDAK disimpan sebagai angka tetap; selalu dihitung dari
--     saldo awal + transaksi aktif, sehingga tidak mungkin berbeda.
-- ---------------------------------------------------------------------

-- Daftar transaksi untuk jamaah: tanpa data pribadi donatur (kecuali diizinkan),
-- tanpa bukti, tanpa ID admin. Hanya transaksi aktif.
create view public.public_transactions
with (security_invoker = false)
as
select
  t.id,
  t.trx_number,
  t.trx_date,
  t.type,
  t.category_id,
  c.name as category_name,
  t.description,
  t.amount,
  case when t.donor_is_public then t.donor_name end as donor_display,
  s.opening_balance
    + sum(case when t.type = 'pemasukan' then t.amount else -t.amount end)
        over (order by t.trx_date, t.created_at, t.id rows between unbounded preceding and current row)
    as running_balance,
  t.created_at
from public.transactions t
join public.transaction_categories c on c.id = t.category_id
cross join public.mosque_settings s
where t.status = 'aktif' and s.id = 1;
comment on view public.public_transactions is 'Transaksi aktif untuk publik dengan saldo berjalan. Nama donatur hanya tampil bila diizinkan.';

-- Ringkasan periode: saldo awal periode, pemasukan, pengeluaran, saldo akhir.
create or replace function public.finance_summary(p_start date default null, p_end date default null)
returns table (
  opening_balance numeric,
  total_income    numeric,
  total_expense   numeric,
  closing_balance numeric,
  trx_count       bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (select opening_balance from public.mosque_settings where id = 1),
  t as (select * from public.transactions where status = 'aktif'),
  before_p as (
    select coalesce(sum(case when type = 'pemasukan' then amount else -amount end), 0) as net
    from t where p_start is not null and trx_date < p_start
  ),
  in_p as (
    select
      coalesce(sum(amount) filter (where type = 'pemasukan'), 0) as inc,
      coalesce(sum(amount) filter (where type = 'pengeluaran'), 0) as exp,
      count(*) as cnt
    from t
    where (p_start is null or trx_date >= p_start) and (p_end is null or trx_date <= p_end)
  )
  select
    (s.opening_balance + b.net)::numeric,
    i.inc::numeric,
    i.exp::numeric,
    (s.opening_balance + b.net + i.inc - i.exp)::numeric,
    i.cnt
  from s, before_p b, in_p i;
$$;

-- Total per bulan untuk grafik (N bulan terakhir, zona waktu masjid).
create or replace function public.finance_monthly(p_months integer default 6)
returns table (month_start date, total_income numeric, total_expense numeric, closing_balance numeric)
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select (date_trunc('month', (now() at time zone 'Asia/Makassar')::date)
            - make_interval(months => greatest(least(p_months, 36), 1) - 1))::date as start_m
  ),
  months as (
    select generate_series((select start_m from bounds),
                           date_trunc('month', (now() at time zone 'Asia/Makassar')::date)::date,
                           interval '1 month')::date as m
  ),
  agg as (
    select date_trunc('month', trx_date)::date as m,
      sum(amount) filter (where type = 'pemasukan') as inc,
      sum(amount) filter (where type = 'pengeluaran') as exp
    from public.transactions where status = 'aktif'
    group by 1
  )
  select
    mo.m,
    coalesce(a.inc, 0)::numeric,
    coalesce(a.exp, 0)::numeric,
    ((select opening_balance from public.mosque_settings where id = 1)
      + coalesce((select sum(case when type = 'pemasukan' then amount else -amount end)
                  from public.transactions
                  where status = 'aktif' and trx_date < (mo.m + interval '1 month')::date), 0))::numeric
  from months mo left join agg a on a.m = mo.m
  order by mo.m;
$$;

-- Total per kategori dalam satu periode.
create or replace function public.finance_by_category(p_start date default null, p_end date default null)
returns table (category_id uuid, category_name text, type text, total numeric, trx_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.type, coalesce(sum(t.amount), 0)::numeric, count(t.id)
  from public.transaction_categories c
  left join public.transactions t
    on t.category_id = c.id and t.status = 'aktif'
   and (p_start is null or t.trx_date >= p_start)
   and (p_end is null or t.trx_date <= p_end)
  group by c.id, c.name, c.type, c.sort_order
  order by c.type, c.sort_order;
$$;

-- Riwayat petugas Jumat: berapa kali bertugas per peran.
create view public.friday_officer_stats
with (security_invoker = true)
as
select
  o.id,
  o.full_name,
  o.roles,
  o.is_active,
  (select count(*) from public.friday_schedules f where f.imam_id = o.id and f.friday_date <= current_date) as as_imam,
  (select count(*) from public.friday_schedules f where f.khatib_id = o.id and f.friday_date <= current_date) as as_khatib,
  (select count(*) from public.friday_schedules f where f.bilal_id = o.id and f.friday_date <= current_date) as as_bilal,
  (select count(*) from public.friday_schedules f where f.muazin_id = o.id and f.friday_date <= current_date) as as_muazin,
  (select max(f.friday_date) from public.friday_schedules f
    where o.id in (f.imam_id, f.khatib_id, f.bilal_id, f.muazin_id) and f.friday_date <= current_date) as last_duty
from public.friday_officers o;

-- ---------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY
--     - Pengunjung (anon) hanya MEMBACA data publik.
--     - Hanya administrator (is_admin) yang boleh menambah/mengubah.
--     - Transaksi tidak dapat dibaca langsung oleh publik (pakai view).
-- ---------------------------------------------------------------------
alter table public.profiles               enable row level security;
alter table public.audit_logs             enable row level security;
alter table public.mosque_settings        enable row level security;
alter table public.prayer_schedules       enable row level security;
alter table public.friday_officers        enable row level security;
alter table public.friday_schedules       enable row level security;
alter table public.transaction_categories enable row level security;
alter table public.transactions           enable row level security;
alter table public.announcements          enable row level security;
alter table public.activities             enable row level security;
alter table public.inventories            enable row level security;

-- profiles: pengguna hanya melihat/mengubah profilnya sendiri.
create policy "profil: baca milik sendiri" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profil: ubah milik sendiri" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- audit_logs: hanya admin yang dapat membaca. Tidak ada policy tulis.
create policy "audit: admin baca" on public.audit_logs
  for select to authenticated using (public.is_admin());

-- Tabel publik: semua orang boleh membaca, admin boleh menulis.
create policy "pengaturan: publik baca" on public.mosque_settings
  for select to anon, authenticated using (true);
create policy "pengaturan: admin ubah" on public.mosque_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "jadwal salat: publik baca" on public.prayer_schedules
  for select to anon, authenticated using (true);
create policy "jadwal salat: admin tambah" on public.prayer_schedules
  for insert to authenticated with check (public.is_admin());
create policy "jadwal salat: admin ubah" on public.prayer_schedules
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "jadwal salat: admin hapus" on public.prayer_schedules
  for delete to authenticated using (public.is_admin());

create policy "petugas jumat: publik baca" on public.friday_officers
  for select to anon, authenticated using (true);
create policy "petugas jumat: admin tambah" on public.friday_officers
  for insert to authenticated with check (public.is_admin());
create policy "petugas jumat: admin ubah" on public.friday_officers
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "petugas jumat: admin hapus" on public.friday_officers
  for delete to authenticated using (public.is_admin());

create policy "jadwal jumat: publik baca" on public.friday_schedules
  for select to anon, authenticated using (true);
create policy "jadwal jumat: admin tambah" on public.friday_schedules
  for insert to authenticated with check (public.is_admin());
create policy "jadwal jumat: admin ubah" on public.friday_schedules
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "jadwal jumat: admin hapus" on public.friday_schedules
  for delete to authenticated using (public.is_admin());

create policy "kategori: publik baca" on public.transaction_categories
  for select to anon, authenticated using (true);
create policy "kategori: admin tambah" on public.transaction_categories
  for insert to authenticated with check (public.is_admin());
create policy "kategori: admin ubah" on public.transaction_categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- transactions: hanya admin. Tidak ada policy DELETE (dan trigger menolak delete).
create policy "transaksi: admin baca" on public.transactions
  for select to authenticated using (public.is_admin());
create policy "transaksi: admin tambah" on public.transactions
  for insert to authenticated with check (public.is_admin());
create policy "transaksi: admin ubah" on public.transactions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "pengumuman: publik baca yang terbit" on public.announcements
  for select to anon, authenticated
  using (public.is_admin() or (status = 'terbit' and publish_at <= now() and (expires_at is null or expires_at > now())));
create policy "pengumuman: admin tambah" on public.announcements
  for insert to authenticated with check (public.is_admin());
create policy "pengumuman: admin ubah" on public.announcements
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "pengumuman: admin hapus" on public.announcements
  for delete to authenticated using (public.is_admin());

create policy "agenda: publik baca" on public.activities
  for select to anon, authenticated using (true);
create policy "agenda: admin tambah" on public.activities
  for insert to authenticated with check (public.is_admin());
create policy "agenda: admin ubah" on public.activities
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "agenda: admin hapus" on public.activities
  for delete to authenticated using (public.is_admin());

create policy "inventaris: publik baca" on public.inventories
  for select to anon, authenticated using (true);
create policy "inventaris: admin tambah" on public.inventories
  for insert to authenticated with check (public.is_admin());
create policy "inventaris: admin ubah" on public.inventories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "inventaris: admin hapus" on public.inventories
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- 12. HAK AKSES (GRANT)
-- ---------------------------------------------------------------------
revoke all on public.transactions from anon;
revoke all on public.audit_logs from anon;
revoke all on public.profiles from anon;
revoke insert, update, delete on public.audit_logs from authenticated;
revoke delete on public.transactions from authenticated;

grant select on public.public_transactions to anon, authenticated;
grant select on public.friday_officer_stats to anon, authenticated;
grant execute on function public.finance_summary(date, date) to anon, authenticated;
grant execute on function public.finance_monthly(integer) to anon, authenticated;
grant execute on function public.finance_by_category(date, date) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 13. STORAGE — bukti transaksi (privat, hanya admin)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bukti-transaksi', 'bukti-transaksi', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "bukti: admin baca" on storage.objects
  for select to authenticated using (bucket_id = 'bukti-transaksi' and public.is_admin());
create policy "bukti: admin unggah" on storage.objects
  for insert to authenticated with check (bucket_id = 'bukti-transaksi' and public.is_admin());

-- ---------------------------------------------------------------------
-- 14. REALTIME — agar layar TV & dashboard diperbarui otomatis
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.mosque_settings, public.prayer_schedules, public.friday_schedules,
      public.announcements, public.activities;
  end if;
end;
$$;
