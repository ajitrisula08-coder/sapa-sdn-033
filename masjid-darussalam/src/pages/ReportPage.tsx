import { ArrowDownRight, ArrowUpRight, FileBarChart, FileDown, FileSpreadsheet, Landmark, Printer, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BalanceChart, IncomeExpenseChart, type ChartPoint } from '../components/FinanceChart';
import { EmptyState, ErrorState, LoadingBlock, PageHeader } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useQuery } from '../hooks/useQuery';
import { friendlyError, getAllPublicTransactions, getFinanceByCategory, getFinanceSummary } from '../lib/api';
import { exportExcel, exportPDF, withPeriodBalance } from '../lib/export';
import { addDaysISO, formatDate, formatDateLong, formatMonthYear, parseISODate, rupiah, todayISO } from '../lib/format';
import { isSupabaseConfigured } from '../lib/supabase';

type Period = 'harian' | 'mingguan' | 'bulanan' | 'tahunan' | 'kustom';

function rangeFor(p: Period, anchor: string, custom: { from: string; to: string }) {
  const d = parseISODate(anchor);
  switch (p) {
    case 'harian': return { from: anchor, to: anchor, label: formatDateLong(anchor) };
    case 'mingguan': {
      const dow = (d.getUTCDay() + 6) % 7; // Senin = 0
      const from = addDaysISO(anchor, -dow);
      const to = addDaysISO(from, 6);
      return { from, to, label: `${formatDate(from)} – ${formatDate(to)}` };
    }
    case 'bulanan': {
      const y = d.getUTCFullYear(); const m = d.getUTCMonth() + 1;
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const mm = String(m).padStart(2, '0');
      return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${last}`, label: formatMonthYear(`${y}-${mm}-01`) };
    }
    case 'tahunan': {
      const y = d.getUTCFullYear();
      return { from: `${y}-01-01`, to: `${y}-12-31`, label: `Tahun ${y}` };
    }
    default: return { from: custom.from, to: custom.to, label: custom.from && custom.to ? `${formatDate(custom.from)} – ${formatDate(custom.to)}` : 'Pilih rentang tanggal' };
  }
}

export default function ReportPage() {
  const { settings } = useSettings();
  const toast = useToast();
  const today = todayISO();
  const [period, setPeriod] = useState<Period>('bulanan');
  const [anchor, setAnchor] = useState(today);
  const [custom, setCustom] = useState({ from: today.slice(0, 8) + '01', to: today });
  const r = rangeFor(period, anchor, custom);
  const valid = !!r.from && !!r.to && r.from <= r.to;
  const [exporting, setExporting] = useState<string | null>(null);

  const q = useQuery(async () => {
    const [summary, categories, rows] = await Promise.all([
      getFinanceSummary(r.from, r.to), getFinanceByCategory(r.from, r.to), getAllPublicTransactions(r.from, r.to),
    ]);
    return { summary, categories, rows };
  }, [r.from, r.to], { topics: ['finance'], enabled: valid });

  const chart = useMemo(() => {
    if (!q.data) return { flow: [] as ChartPoint[], balance: [] as ChartPoint[] };
    const yearly = period === 'tahunan' || (period === 'kustom' && parseISODate(r.to).getTime() - parseISODate(r.from).getTime() > 62 * 86400000);
    const keyOf = (iso: string) => (yearly ? iso.slice(0, 7) : iso);
    const buckets = new Map<string, ChartPoint>();
    // Buat bucket kosong untuk seluruh periode agar sumbu waktu tidak berlubang.
    const last = r.to < today ? r.to : today;
    let cur = r.from;
    for (let i = 0; cur <= last && i < 400; i++) {
      const k = keyOf(cur);
      if (!buckets.has(k)) buckets.set(k, { label: yearly ? parseISODate(`${k}-01`).toLocaleDateString('id-ID', { month: 'short', timeZone: 'UTC' }) : parseISODate(k).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' }), income: 0, expense: 0 });
      cur = addDaysISO(cur, 1);
    }
    for (const t of q.data.rows) {
      const b = buckets.get(keyOf(t.trx_date));
      if (!b) continue;
      if (t.type === 'pemasukan') b.income += t.amount; else b.expense += t.amount;
    }
    let bal = q.data.summary.opening_balance;
    const flow = [...buckets.values()];
    const balance = flow.map((b) => { bal += b.income - b.expense; return { ...b, balance: bal }; });
    return { flow, balance };
  }, [q.data, period, r.from, r.to, today]);

  async function doExport(kind: 'pdf' | 'xlsx') {
    if (!q.data) return;
    setExporting(kind);
    try {
      const title = `Laporan Keuangan ${period === 'kustom' ? '' : period[0].toUpperCase() + period.slice(1)}`.trim();
      const d = { title, periodLabel: r.label, summary: q.data.summary, rows: q.data.rows, categories: q.data.categories, settings };
      if (kind === 'pdf') await exportPDF(d); else await exportExcel(d);
      toast.success('Laporan berhasil diunduh.');
    } catch (e) { toast.error(friendlyError(e)); } finally { setExporting(null); }
  }

  const rowsWithBal = q.data ? withPeriodBalance(q.data.rows, q.data.summary.opening_balance) : [];
  const income = q.data?.categories.filter((c) => c.type === 'pemasukan') ?? [];
  const expense = q.data?.categories.filter((c) => c.type === 'pengeluaran') ?? [];

  return (
    <div>
      <PageHeader icon={FileBarChart} title="Laporan Keuangan" subtitle={`Periode: ${r.label}`}
        actions={<>
          <button className="btn-outline" disabled={!q.data} onClick={() => window.print()}><Printer className="size-4" /> Cetak</button>
          <button className="btn-outline" disabled={!q.data || !!exporting} onClick={() => doExport('pdf')}><FileDown className="size-4" /> {exporting === 'pdf' ? 'Membuat…' : 'PDF'}</button>
          <button className="btn-primary" disabled={!q.data || !!exporting} onClick={() => doExport('xlsx')}><FileSpreadsheet className="size-4" /> {exporting === 'xlsx' ? 'Membuat…' : 'Excel'}</button>
        </>} />

      <div className="card no-print mb-5 flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
          {(['harian', 'mingguan', 'bulanan', 'tahunan', 'kustom'] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold capitalize transition ${period === p ? 'bg-white text-emerald-800 shadow' : 'text-slate-500 hover:text-slate-700'}`}>{p === 'kustom' ? 'Rentang' : p}</button>
          ))}
        </div>
        {period === 'kustom' ? (
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" className="input w-auto" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} aria-label="Dari tanggal" />
            <span className="text-slate-400">s.d.</span>
            <input type="date" className="input w-auto" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} aria-label="Sampai tanggal" />
          </div>
        ) : period === 'bulanan' ? (
          <input type="month" className="input w-auto" value={anchor.slice(0, 7)} onChange={(e) => e.target.value && setAnchor(`${e.target.value}-01`)} aria-label="Pilih bulan" />
        ) : period === 'tahunan' ? (
          <select className="input w-auto" value={anchor.slice(0, 4)} onChange={(e) => setAnchor(`${e.target.value}-01-01`)} aria-label="Pilih tahun">
            {Array.from({ length: 8 }, (_, i) => Number(today.slice(0, 4)) - i).map((y) => <option key={y}>{y}</option>)}
          </select>
        ) : (
          <input type="date" className="input w-auto" value={anchor} onChange={(e) => e.target.value && setAnchor(e.target.value)} aria-label="Pilih tanggal" />
        )}
        {!valid && period === 'kustom' && <p className="text-sm text-rose-600">Tanggal awal harus sebelum tanggal akhir.</p>}
      </div>

      {/* Kop cetak */}
      <div className="mb-4 hidden border-b-2 border-emerald-800 pb-3 print:block">
        <p className="font-display text-2xl font-bold">{settings.name.toUpperCase()}</p>
        <p className="text-sm">{settings.address}, {settings.district}, {settings.regency}, {settings.province}</p>
        <p className="mt-2 font-semibold">Laporan Keuangan — {r.label}</p>
      </div>

      {!isSupabaseConfigured ? <div className="card"><EmptyState icon={Wallet} title="Data keuangan belum tersedia" /></div>
        : !valid ? null
        : q.loading && !q.data ? <LoadingBlock />
        : q.error ? <ErrorState message={q.error} onRetry={() => q.reload()} />
        : q.data && (<div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {([
              ['Saldo Awal Periode', q.data.summary.opening_balance, Wallet, 'text-slate-500'],
              ['Total Pemasukan', q.data.summary.total_income, ArrowUpRight, 'text-emerald-600'],
              ['Total Pengeluaran', q.data.summary.total_expense, ArrowDownRight, 'text-amber-600'],
              ['Saldo Akhir Periode', q.data.summary.closing_balance, Landmark, 'text-emerald-800'],
            ] as const).map(([l, v, Icon, c], i) => (
              <div key={l} className={`card p-5 ${i === 3 ? 'ring-2 ring-emerald-600/30' : ''}`}>
                <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-500">{l}</p><Icon className={`size-5 ${c}`} /></div>
                <p className="mt-2 font-display text-[1.8rem] font-bold text-emerald-950 tabular">{rupiah(v)}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card p-5">
              <p className="mb-2 text-sm font-semibold text-slate-600">Pemasukan & pengeluaran</p>
              <IncomeExpenseChart data={chart.flow} />
            </div>
            <div className="card p-5">
              <p className="mb-2 text-sm font-semibold text-slate-600">Perkembangan saldo kas</p>
              <BalanceChart data={chart.balance} height={260} />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {([['Pemasukan per Kategori', income, 'text-emerald-700'], ['Pengeluaran per Kategori', expense, 'text-amber-700']] as const).map(([title, list, tone]) => {
              const total = list.reduce((a, c) => a + c.total, 0);
              return (
                <div key={title} className="card p-5">
                  <h3 className="mb-3 font-display text-lg font-bold text-emerald-950">{title}</h3>
                  <ul className="space-y-2.5">
                    {list.map((c) => (
                      <li key={c.category_id}>
                        <div className="flex justify-between text-sm"><span className="text-slate-700">{c.category_name} <span className="text-xs text-slate-400">({c.trx_count})</span></span><span className={`font-semibold tabular ${tone}`}>{rupiah(c.total)}</span></div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${tone === 'text-emerald-700' ? 'bg-emerald-600' : 'bg-gold-500'}`} style={{ width: `${total ? (c.total / total) * 100 : 0}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 border-t border-slate-100 pt-3 text-right text-sm font-bold text-slate-800">Total: {rupiah(total)}</p>
                </div>
              );
            })}
          </div>

          <div className="card overflow-hidden">
            <h3 className="border-b border-slate-100 p-4 font-display text-lg font-bold text-emerald-950">Rincian Transaksi ({rowsWithBal.length})</h3>
            {!rowsWithBal.length ? <EmptyState title="Tidak ada transaksi pada periode ini" /> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <tr><th className="px-4 py-3">No</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">No. Transaksi</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Keterangan</th><th className="px-4 py-3 text-right">Masuk</th><th className="px-4 py-3 text-right">Keluar</th><th className="px-4 py-3 text-right">Saldo</th></tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 bg-emerald-50/40 font-semibold"><td colSpan={7} className="px-4 py-2.5 text-slate-600">Saldo awal periode</td><td className="px-4 py-2.5 text-right tabular">{rupiah(q.data.summary.opening_balance)}</td></tr>
                    {rowsWithBal.map((t, i) => (
                      <tr key={t.id} className="border-b border-slate-100">
                        <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                        <td className="whitespace-nowrap px-4 py-2.5">{formatDate(t.trx_date)}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-500">{t.trx_number}</td>
                        <td className="px-4 py-2.5">{t.category_name}</td>
                        <td className="px-4 py-2.5">{t.description}{t.donor_display ? ` — ${t.donor_display}` : ''}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular text-emerald-700">{t.type === 'pemasukan' ? rupiah(t.amount) : ''}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular text-amber-700">{t.type === 'pengeluaran' ? rupiah(t.amount) : ''}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular">{rupiah(t.period_balance)}</td>
                      </tr>
                    ))}
                    <tr className="bg-emerald-950 font-bold text-white"><td colSpan={5} className="px-4 py-3">Total periode</td><td className="px-4 py-3 text-right tabular">{rupiah(q.data.summary.total_income)}</td><td className="px-4 py-3 text-right tabular">{rupiah(q.data.summary.total_expense)}</td><td className="px-4 py-3 text-right tabular text-gold-300">{rupiah(q.data.summary.closing_balance)}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>)}
    </div>
  );
}
