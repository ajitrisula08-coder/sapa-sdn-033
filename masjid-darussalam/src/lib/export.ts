import { formatDate, formatDateTime, rupiah } from './format';
import type { CategoryTotal, FinanceSummary, MosqueSettings, PublicTransaction } from './types';

export interface ReportData {
  title: string;
  periodLabel: string;
  summary: FinanceSummary;
  rows: PublicTransaction[];
  categories?: CategoryTotal[];
  settings: MosqueSettings;
}

function fileSafe(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Hitung saldo berjalan relatif terhadap saldo awal periode (rows harus urut naik). */
export function withPeriodBalance(rows: PublicTransaction[], opening: number) {
  let bal = opening;
  return rows.map((r) => {
    bal += r.type === 'pemasukan' ? r.amount : -r.amount;
    return { ...r, period_balance: bal };
  });
}

export async function exportPDF(d: ReportData) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const green: [number, number, number] = [6, 78, 59];
  const gold: [number, number, number] = [201, 162, 39];

  // Kop
  doc.setFillColor(...green);
  doc.rect(0, 0, W, 30, 'F');
  doc.setFillColor(...gold);
  doc.rect(0, 30, W, 1.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(d.settings.name.toUpperCase(), 14, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${d.settings.address}, ${d.settings.district}, ${d.settings.regency}, ${d.settings.province}`, 14, 19.5);
  doc.text(d.settings.subtitle, 14, 24.5);

  doc.setTextColor(20, 30, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(d.title, 14, 41);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Periode: ${d.periodLabel}`, 14, 47);

  autoTable(doc, {
    startY: 52,
    theme: 'grid',
    head: [['Saldo Awal Periode', 'Total Pemasukan', 'Total Pengeluaran', 'Saldo Akhir']],
    body: [[rupiah(d.summary.opening_balance), rupiah(d.summary.total_income), rupiah(d.summary.total_expense), rupiah(d.summary.closing_balance)]],
    headStyles: { fillColor: green, fontSize: 9 },
    bodyStyles: { fontStyle: 'bold', fontSize: 10 },
    styles: { halign: 'center' },
  });

  if (d.categories?.length) {
    const cats = d.categories.filter((c) => c.total > 0);
    if (cats.length) {
      autoTable(doc, {
        theme: 'striped',
        head: [['Kategori', 'Jenis', 'Jumlah Transaksi', 'Total']],
        body: cats.map((c) => [c.category_name, c.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran', String(c.trx_count), rupiah(c.total)]),
        headStyles: { fillColor: gold, textColor: [20, 30, 25], fontSize: 9 },
        styles: { fontSize: 8.5 },
        columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right' } },
      });
    }
  }

  const rows = withPeriodBalance(d.rows, d.summary.opening_balance);
  autoTable(doc, {
    theme: 'striped',
    head: [['No', 'Tanggal', 'No. Transaksi', 'Kategori', 'Keterangan', 'Masuk', 'Keluar', 'Saldo']],
    body: rows.length ? rows.map((r, i) => [
      String(i + 1), formatDate(r.trx_date), r.trx_number, r.category_name,
      r.description + (r.donor_display ? ` (${r.donor_display})` : ''),
      r.type === 'pemasukan' ? rupiah(r.amount) : '', r.type === 'pengeluaran' ? rupiah(r.amount) : '', rupiah(r.period_balance),
    ]) : [[{ content: 'Tidak ada transaksi pada periode ini.', colSpan: 8, styles: { halign: 'center' } }]],
    headStyles: { fillColor: green, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 1.6 },
    columnStyles: { 0: { cellWidth: 8 }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(`Dicetak ${formatDateTime(new Date())} WITA · Saldo dihitung otomatis: saldo awal + pemasukan − pengeluaran`, 14, 290);
    doc.text(`Hal. ${i}/${pages}`, W - 14, 290, { align: 'right' });
  }
  doc.save(`${fileSafe(d.title)}-${fileSafe(d.periodLabel)}.pdf`);
}

export async function exportExcel(d: ReportData) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = d.settings.name;
  wb.created = new Date();
  const ws = wb.addWorksheet('Laporan');
  const money = '"Rp" #,##0;[Red]-"Rp" #,##0';

  ws.mergeCells('A1:H1');
  ws.getCell('A1').value = d.settings.name.toUpperCase();
  ws.getCell('A1').font = { bold: true, size: 15, color: { argb: 'FF064E3B' } };
  ws.mergeCells('A2:H2');
  ws.getCell('A2').value = `${d.settings.address}, ${d.settings.district}, ${d.settings.regency}`;
  ws.mergeCells('A3:H3');
  ws.getCell('A3').value = `${d.title} — Periode: ${d.periodLabel}`;
  ws.getCell('A3').font = { bold: true };

  const sum = [
    ['Saldo awal periode', d.summary.opening_balance],
    ['Total pemasukan', d.summary.total_income],
    ['Total pengeluaran', d.summary.total_expense],
    ['Saldo akhir', d.summary.closing_balance],
  ] as const;
  sum.forEach(([l, v], i) => {
    const r = ws.getRow(5 + i);
    r.getCell(1).value = l;
    r.getCell(3).value = v;
    r.getCell(3).numFmt = money;
    r.font = { bold: i === 3 };
  });

  const headerRow = 10;
  const header = ['No', 'Tanggal', 'No. Transaksi', 'Jenis', 'Kategori', 'Keterangan', 'Masuk', 'Keluar', 'Saldo'];
  ws.getRow(headerRow).values = header;
  ws.getRow(headerRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(headerRow).eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } }; });
  withPeriodBalance(d.rows, d.summary.opening_balance).forEach((r, i) => {
    const row = ws.getRow(headerRow + 1 + i);
    row.values = [
      i + 1, new Date(r.trx_date + 'T00:00:00'), r.trx_number, r.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran', r.category_name,
      r.description + (r.donor_display ? ` (${r.donor_display})` : ''),
      r.type === 'pemasukan' ? r.amount : null, r.type === 'pengeluaran' ? r.amount : null, r.period_balance,
    ];
    row.getCell(2).numFmt = 'dd/mm/yyyy';
    [7, 8, 9].forEach((c) => { row.getCell(c).numFmt = money; });
  });
  [6, 12, 18, 13, 22, 44, 16, 16, 18].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  if (d.categories?.length) {
    const wc = wb.addWorksheet('Per Kategori');
    wc.addRow(['Kategori', 'Jenis', 'Jumlah Transaksi', 'Total']).font = { bold: true };
    d.categories.forEach((c) => {
      const r = wc.addRow([c.category_name, c.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran', c.trx_count, c.total]);
      r.getCell(4).numFmt = money;
    });
    [26, 14, 18, 18].forEach((w, i) => { wc.getColumn(i + 1).width = w; });
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${fileSafe(d.title)}-${fileSafe(d.periodLabel)}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
