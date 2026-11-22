import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { rupiah, rupiahShort } from '../lib/format';

export const SERIES = { income: '#047857', expense: '#c9a227', balance: '#047857' };

export interface ChartPoint { label: string; income: number; expense: number; balance?: number }

const tooltipStyle = {
  borderRadius: 14, border: '1px solid rgb(6 78 59 / 0.08)', boxShadow: '0 12px 32px -12px rgb(6 78 59 / .3)', fontSize: 13,
};

/** Grafik batang pemasukan vs pengeluaran (satu sumbu). */
export function IncomeExpenseChart({ data, height = 260 }: { data: ChartPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barGap={2} barCategoryGap="24%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 4" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
        <YAxis tickFormatter={rupiahShort} tickLine={false} axisLine={false} width={62} tick={{ fill: '#64748b', fontSize: 12 }} />
        <Tooltip cursor={{ fill: 'rgb(16 185 129 / 0.06)' }} contentStyle={tooltipStyle}
          formatter={(v, name) => [rupiah(Number(v)), name === 'income' ? 'Pemasukan' : 'Pengeluaran']} />
        <Legend itemSorter={null} iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 13, paddingTop: 6 }}
          formatter={(v) => <span className="text-slate-600">{v === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span>} />
        <Bar dataKey="income" fill={SERIES.income} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expense" fill={SERIES.expense} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Grafik area saldo kas. */
export function BalanceChart({ data, height = 220 }: { data: ChartPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SERIES.balance} stopOpacity={0.22} />
            <stop offset="1" stopColor={SERIES.balance} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 4" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} minTickGap={16} />
        <YAxis tickFormatter={rupiahShort} tickLine={false} axisLine={false} width={62} tick={{ fill: '#64748b', fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [rupiah(Number(v)), 'Saldo']} />
        <Area type="monotone" dataKey="balance" stroke={SERIES.balance} strokeWidth={2} fill="url(#balFill)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
