// GitHub Pages tidak punya "SPA fallback". Agar alamat seperti /masjid/tv atau
// /masjid/keuangan bisa dibuka langsung (dan di-refresh), salin index.html ke
// folder setiap halaman.
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] ?? 'pages-dist';
const routes = ['tv', 'jadwal-salat', 'jumat', 'petugas-jumat', 'keuangan', 'laporan', 'agenda', 'pengumuman', 'inventaris', 'pengaturan', 'login'];
for (const r of routes) {
  mkdirSync(join(out, r), { recursive: true });
  copyFileSync(join(out, 'index.html'), join(out, r, 'index.html'));
}
copyFileSync(join(out, 'index.html'), join(out, '404.html'));
console.log(`Halaman disalin untuk ${routes.length} rute di ${out}/`);
