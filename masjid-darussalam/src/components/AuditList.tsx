import { History } from 'lucide-react';
import { useQuery } from '../hooks/useQuery';
import { getAuditLogs } from '../lib/api';
import { ACTION_LABEL, diffAudit } from '../lib/audit';
import { formatDateTime } from '../lib/format';
import { Badge, EmptyState, ErrorState, LoadingBlock } from './ui';

const TABLE_LABEL: Record<string, string> = {
  transactions: 'Transaksi', prayer_schedules: 'Jadwal salat manual', mosque_settings: 'Pengaturan masjid',
  friday_schedules: 'Jadwal Jumat', friday_officers: 'Petugas Jumat', announcements: 'Pengumuman',
  activities: 'Agenda', inventories: 'Inventaris', transaction_categories: 'Kategori transaksi',
};

/** Daftar riwayat perubahan (hanya admin yang dapat membaca audit_logs). */
export function AuditList({ table, recordId, limit = 50, describe }: {
  table?: string | string[]; recordId?: string; limit?: number; describe?: (data: Record<string, unknown>) => string;
}) {
  const q = useQuery(() => getAuditLogs({ table, recordId, limit }), [JSON.stringify(table), recordId, limit]);
  if (q.loading) return <LoadingBlock label="Memuat riwayat…" />;
  if (q.error) return <ErrorState message={q.error} onRetry={() => q.reload()} />;
  if (!q.data?.length) return <EmptyState icon={History} title="Belum ada riwayat perubahan" />;
  return (
    <ol className="relative space-y-4 border-l-2 border-emerald-100 pl-5">
      {q.data.map((log) => {
        const diff = diffAudit(log);
        const data = (log.new_data ?? log.old_data ?? {}) as Record<string, unknown>;
        return (
          <li key={log.id} className="relative">
            <span className="absolute -left-[27px] top-1.5 size-3 rounded-full border-2 border-white bg-emerald-500 ring-2 ring-emerald-100" />
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Badge tone={log.action === 'VOID' || log.action === 'DELETE' ? 'rose' : log.action === 'INSERT' ? 'emerald' : 'gold'}>{ACTION_LABEL[log.action]}</Badge>
              {!table || Array.isArray(table) ? <span className="font-semibold text-slate-600">{TABLE_LABEL[log.table_name] ?? log.table_name}</span> : null}
              <span>{formatDateTime(log.changed_at)}</span>
            </div>
            {describe && <p className="mt-1 text-sm font-medium text-slate-700">{describe(data)}</p>}
            {log.reason && <p className="mt-1 text-sm text-slate-600">Alasan: <i>{log.reason}</i></p>}
            {diff.length > 0 && (
              <ul className="mt-1.5 space-y-0.5 text-xs text-slate-600">
                {diff.map((d) => (
                  <li key={d.field}><b>{d.field}:</b> <span className="text-rose-600 line-through">{d.from}</span> → <span className="text-emerald-700">{d.to}</span></li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
