import {
  ArrowDownRight, ArrowUpRight, Ban, FileDown, FileSpreadsheet, History, Landmark, Minus, Paperclip, Pencil, Plus, Search, Wallet, X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminOnly } from '../components/AdminGate';
import { AuditList } from '../components/AuditList';
import { TransactionModal } from '../components/TransactionModal';
import { AnimatedNumber, Badge, EmptyState, ErrorState, LoadingBlock, Modal, PageHeader, Pagination, Skeleton, useConfirm } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useQuery } from '../hooks/useQuery';
import {
  friendlyError, getAdminTransactions, getAllPublicTransactions, getCategories, getFinanceSummary, getPublicTransactions,
  proofUrl, voidTransaction, type TrxFilter,
} from '../lib/api';
import { emitDataChanged } from '../lib/events';
import { exportExcel, exportPDF } from '../lib/export';
import { formatDate, formatDateTime, rupiah } from '../lib/format';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Transaction, TrxType } from '../lib/types';

const PAGE = 20;

function useDebounced<T>(v: T, ms = 350) {
  const [d, setD] = useState(v);
  useEffect(() => { const id = setTimeout(() => setD(v), ms); return () => clearTimeout(id); }, [v, ms]);
  return d;
}

export default function FinancePage() {
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<TrxFilter>({ from: '', to: '', type: '', categoryId: '', search: '' });
  const [page, setPage] = useState(0);
  const [includeVoided, setIncludeVoided] = useState(false);
  const search = useDebounced(filter.search ?? '');
  const f: TrxFilter = { ...filter, search, page, pageSize: PAGE, includeVoided };
  const fKey = JSON.stringify(f);
  useEffect(() => { setPage(0); }, [filter.from, filter.to, filter.type, filter.categoryId, search, includeVoided]);

  const summary = useQuery(() => getFinanceSummary(null, null), [], { topics: ['finance'] });
  const filtered = useQuery(() => getFinanceSummary(filter.from || null, filter.to || null), [filter.from, filter.to], { topics: ['finance'] });
  const categories = useQuery(getCategories, []);
  const pub = useQuery(() => getPublicTransactions(f), [fKey], { topics: ['finance'], enabled: !isAdmin });
  const adm = useQuery(() => getAdminTransactions(f), [fKey], { topics: ['finance'], enabled: isAdmin });

  const [modal, setModal] = useState<{ type: TrxType; existing?: Transaction } | null>(null);
  const [historyOf, setHistoryOf] = useState<Transaction | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null);

  const cats = categories.data ?? [];
  const list = isAdmin ? adm : pub;

  async function doVoid(t: Transaction) {
    const r = await confirm({
      title: `Batalkan transaksi ${t.trx_number}?`,
      message: <p>Transaksi <b>{t.description}</b> sebesar <b>{rupiah(t.amount)}</b> akan dibatalkan dan tidak lagi dihitung dalam saldo. Data tetap tersimpan di riwayat audit dan <b>tidak dapat diaktifkan kembali</b>.</p>,
      tone: 'danger', confirmLabel: 'Batalkan transaksi', requireReason: 'Alasan pembatalan',
    });
    if (!r.ok) return;
    try { await voidTransaction(t.id, r.reason); toast.success(`Transaksi ${t.trx_number} dibatalkan.`); emitDataChanged('finance'); }
    catch (e) { toast.error(friendlyError(e)); }
  }

  async function openProof(path: string) {
    try { window.open(await proofUrl(path), '_blank', 'noopener'); } catch (e) { toast.error(friendlyError(e)); }
  }

  async function doExport(kind: 'pdf' | 'xlsx') {
    setExporting(kind);
    try {
      const [rows, sum] = await Promise.all([getAllPublicTransactions(filter.from || null, filter.to || null), getFinanceSummary(filter.from || null, filter.to || null)]);
      const periodLabel = filter.from || filter.to ? `${filter.from ? formatDate(filter.from) : 'Awal'} – ${filter.to ? formatDate(filter.to) : 'Sekarang'}` : 'Seluruh periode';
      const data = { title: 'Laporan Kas Masjid', periodLabel, summary: sum, rows, settings };
      if (kind === 'pdf') await exportPDF(data); else await exportExcel(data);
      toast.success(kind === 'pdf' ? 'File PDF berhasil dibuat.' : 'File Excel berhasil dibuat.');
    } catch (e) { toast.error(friendlyError(e)); } finally { setExporting(null); }
  }

  const s = summary.data;
  const hasFilter = !!(filter.from || filter.to || filter.type || filter.categoryId || filter.search);

  return (
    <div>
      <PageHeader icon={Wallet} title="Keuangan Masjid" subtitle="Transparansi kas Masjid Darussalam untuk seluruh jamaah"
        actions={<>
          <button className="btn-outline" disabled={!isSupabaseConfigured || !!exporting} onClick={() => doExport('pdf')}><FileDown className="size-4" /> {exporting === 'pdf' ? 'Membuat…' : 'PDF'}</button>
          <button className="btn-outline" disabled={!isSupabaseConfigured || !!exporting} onClick={() => doExport('xlsx')}><FileSpreadsheet className="size-4" /> {exporting === 'xlsx' ? 'Membuat…' : 'Excel'}</button>
          <AdminOnly>
            <button className="btn-primary" onClick={() => setModal({ type: 'pemasukan' })}><Plus className="size-4" /> Pemasukan</button>
            <button className="btn-gold" onClick={() => setModal({ type: 'pengeluaran' })}><Minus className="size-4" /> Pengeluaran</button>
          </AdminOnly>
        </>} />

      {!isSupabaseConfigured ? <div className="card"><EmptyState icon={Wallet} title="Data keuangan belum tersedia" description="Aplikasi belum terhubung ke database. Saldo tidak pernah diisi data contoh." /></div> : (<>
        {/* Ringkasan */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {([
            ['Saldo Kas Terkini', s?.closing_balance, Landmark, 'hero'],
            ['Saldo Awal', s?.opening_balance, Wallet, 'plain'],
            ['Total Pemasukan', s?.total_income, ArrowUpRight, 'in'],
            ['Total Pengeluaran', s?.total_expense, ArrowDownRight, 'out'],
          ] as const).map(([label, v, Icon, tone]) => (
            <div key={label} className={`relative overflow-hidden rounded-2xl p-5 ${tone === 'hero' ? 'bg-islamic text-white shadow-lift' : 'card'}`}>
              {tone === 'hero' && <div className="pattern-overlay pointer-events-none absolute inset-0 opacity-10" />}
              <div className="relative flex items-center justify-between">
                <p className={`text-sm font-semibold ${tone === 'hero' ? 'text-emerald-50/85' : 'text-slate-500'}`}>{label}</p>
                <Icon className={`size-5 ${tone === 'hero' ? 'text-gold-300' : tone === 'in' ? 'text-emerald-600' : tone === 'out' ? 'text-amber-600' : 'text-slate-400'}`} />
              </div>
              {summary.loading ? <Skeleton className="mt-3 h-8 w-3/4" /> : summary.error ? <p className="mt-2 text-sm text-rose-600">{summary.error}</p> : (
                <p className={`relative mt-2 font-display text-[1.9rem] font-bold leading-tight ${tone === 'hero' ? 'gold-text' : 'text-emerald-950'}`}><AnimatedNumber value={v ?? 0} format={rupiah} /></p>
              )}
              {tone === 'plain' && settings.opening_balance_date && <p className="text-xs text-slate-400">per {formatDate(settings.opening_balance_date)}</p>}
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="card mb-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr]">
            <label className="relative">
              <span className="sr-only">Cari transaksi</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Cari keterangan / nomor…" value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })} />
            </label>
            <label className="flex items-center gap-2"><span className="w-12 shrink-0 text-xs font-semibold text-slate-500 lg:hidden">Dari</span><input type="date" className="input" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} title="Dari tanggal" /></label>
            <label className="flex items-center gap-2"><span className="w-12 shrink-0 text-xs font-semibold text-slate-500 lg:hidden">Sampai</span><input type="date" className="input" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} title="Sampai tanggal" /></label>
            <select className="input" value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value as TrxType | '', categoryId: '' })} aria-label="Jenis transaksi">
              <option value="">Semua jenis</option><option value="pemasukan">Pemasukan</option><option value="pengeluaran">Pengeluaran</option>
            </select>
            <select className="input" value={filter.categoryId} onChange={(e) => setFilter({ ...filter, categoryId: e.target.value })} aria-label="Kategori">
              <option value="">Semua kategori</option>
              {cats.filter((c) => !filter.type || c.type === filter.type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-3 text-slate-500">
              {(filter.from || filter.to) && filtered.data && (
                <span>Periode: masuk <b className="text-emerald-700">{rupiah(filtered.data.total_income)}</b> · keluar <b className="text-amber-700">{rupiah(filtered.data.total_expense)}</b> · saldo akhir <b className="text-slate-800">{rupiah(filtered.data.closing_balance)}</b></span>
              )}
              <AdminOnly>
                <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-emerald-700" checked={includeVoided} onChange={(e) => setIncludeVoided(e.target.checked)} /> Tampilkan transaksi dibatalkan</label>
              </AdminOnly>
            </div>
            {hasFilter && <button className="btn-ghost px-3 py-1.5" onClick={() => setFilter({ from: '', to: '', type: '', categoryId: '', search: '' })}><X className="size-4" /> Reset filter</button>}
          </div>
        </div>

        {/* Tabel */}
        <div className="card overflow-hidden">
          {list.loading && !list.data ? <LoadingBlock /> : list.error ? <div className="p-4"><ErrorState message={list.error} onRetry={() => list.reload()} /></div>
            : !list.data?.rows.length ? <EmptyState icon={Wallet} title={hasFilter ? 'Tidak ada transaksi yang cocok' : 'Belum ada transaksi'} description={hasFilter ? 'Coba ubah filter pencarian.' : 'Transaksi akan muncul setelah dicatat oleh administrator.'} />
            : (<>
              {/* Tampilan kartu untuk HP */}
              <ul className="divide-y divide-slate-100 md:hidden">
                {(isAdmin ? adm.data!.rows : pub.data!.rows).map((t) => {
                  const at = t as Transaction;
                  const voided = isAdmin && at.status === 'dibatalkan';
                  return (
                    <li key={t.id} className={`p-4 ${voided ? 'bg-rose-50/40 opacity-70' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`font-semibold text-slate-800 ${voided ? 'line-through' : ''}`}>{t.description}</p>
                          <p className="text-xs text-slate-500">{formatDate(t.trx_date)} · {isAdmin ? at.category?.name : (t as { category_name: string }).category_name} · {t.trx_number}</p>
                          {voided && <Badge tone="rose" className="mt-1">Dibatalkan</Badge>}
                        </div>
                        <p className={`shrink-0 font-bold tabular ${t.type === 'pemasukan' ? 'text-emerald-700' : 'text-amber-700'}`}>{t.type === 'pemasukan' ? '+' : '−'}{rupiah(t.amount)}</p>
                      </div>
                      {!isAdmin && <p className="mt-1 text-right text-xs text-slate-400">Saldo: {rupiah((t as { running_balance: number }).running_balance)}</p>}
                      {isAdmin && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {!voided && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setModal({ type: t.type, existing: at })}><Pencil className="size-3.5" /> Edit</button>}
                          {!voided && <button className="btn-ghost px-2 py-1 text-xs text-rose-600" onClick={() => doVoid(at)}><Ban className="size-3.5" /> Batalkan</button>}
                          <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setHistoryOf(at)}><History className="size-3.5" /> Riwayat</button>
                          {at.proof_path && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openProof(at.proof_path!)}><Paperclip className="size-3.5" /> Bukti</button>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {/* Tabel untuk layar lebar */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead className="bg-emerald-950 text-left text-xs uppercase tracking-wider text-emerald-50">
                    <tr>
                      <th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">No. Transaksi</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Keterangan</th>
                      <th className="px-4 py-3 text-right">Masuk</th><th className="px-4 py-3 text-right">Keluar</th>
                      {isAdmin ? <th className="px-4 py-3 text-right">Aksi</th> : <th className="px-4 py-3 text-right">Saldo</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {isAdmin ? adm.data!.rows.map((t) => {
                      const voided = t.status === 'dibatalkan';
                      return (
                        <tr key={t.id} className={`border-b border-slate-100 ${voided ? 'bg-rose-50/40 text-slate-400' : 'hover:bg-slate-50'}`}>
                          <td className="whitespace-nowrap px-4 py-3">{formatDate(t.trx_date)}</td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{t.trx_number}</td>
                          <td className="px-4 py-3">{t.category?.name}</td>
                          <td className="px-4 py-3">
                            <p className={voided ? 'line-through' : 'text-slate-800'}>{t.description}</p>
                            <p className="text-xs text-slate-400">
                              {t.donor_name && <>Donatur: {t.donor_name}{t.donor_is_public ? ' (publik)' : ' (privat)'} · </>}
                              Dicatat {t.recorded_by_name ?? 'admin'}, {formatDateTime(t.created_at)}
                            </p>
                            {voided && <p className="text-xs text-rose-600">Dibatalkan: {t.void_reason}</p>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular text-emerald-700">{t.type === 'pemasukan' ? rupiah(t.amount) : ''}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular text-amber-700">{t.type === 'pengeluaran' ? rupiah(t.amount) : ''}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            {t.proof_path && <button className="btn-ghost px-2 py-1.5" title="Lihat bukti" onClick={() => openProof(t.proof_path!)}><Paperclip className="size-4" /></button>}
                            <button className="btn-ghost px-2 py-1.5" title="Riwayat perubahan" onClick={() => setHistoryOf(t)}><History className="size-4" /></button>
                            {!voided && <button className="btn-ghost px-2 py-1.5" title="Edit" onClick={() => setModal({ type: t.type, existing: t })}><Pencil className="size-4" /></button>}
                            {!voided && <button className="btn-ghost px-2 py-1.5 text-rose-600" title="Batalkan" onClick={() => doVoid(t)}><Ban className="size-4" /></button>}
                          </td>
                        </tr>
                      );
                    }) : pub.data!.rows.map((t) => (
                      <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3">{formatDate(t.trx_date)}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">{t.trx_number}</td>
                        <td className="px-4 py-3">{t.category_name}</td>
                        <td className="px-4 py-3 text-slate-800">{t.description}{t.donor_display && <span className="text-slate-500"> — {t.donor_display}</span>}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular text-emerald-700">{t.type === 'pemasukan' ? rupiah(t.amount) : ''}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular text-amber-700">{t.type === 'pengeluaran' ? rupiah(t.amount) : ''}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular text-slate-800">{rupiah(t.running_balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pageSize={PAGE} count={list.data.count} onChange={setPage} />
            </>)}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Saldo dihitung otomatis dari database: <b>saldo awal + total pemasukan − total pengeluaran</b>. Transaksi yang dibatalkan tidak dihitung.
          Nama donatur hanya ditampilkan jika donatur mengizinkan. Laporan per periode tersedia di <Link to="/laporan" className="font-semibold text-emerald-700 underline">Laporan Keuangan</Link>.
        </p>
      </>)}

      {modal && <TransactionModal type={modal.type} existing={modal.existing} categories={cats} onClose={() => setModal(null)} />}
      <Modal open={!!historyOf} onClose={() => setHistoryOf(null)} title={`Riwayat ${historyOf?.trx_number ?? ''}`} size="lg">
        {historyOf && <AuditList table="transactions" recordId={historyOf.id} />}
      </Modal>
    </div>
  );
}
