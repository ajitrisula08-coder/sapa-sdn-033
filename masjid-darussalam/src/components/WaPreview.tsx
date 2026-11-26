import { CheckCheck } from 'lucide-react';
import type { ReactNode } from 'react';

/** Ubah format teks WhatsApp (*tebal*, _miring_, ~coret~) menjadi elemen React. */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const inner = tok.slice(1, -1);
    const k = `${keyBase}-${i++}`;
    if (tok[0] === '*') out.push(<b key={k}>{inline(inner, k)}</b>);
    else if (tok[0] === '_') out.push(<i key={k}>{inline(inner, k)}</i>);
    else out.push(<s key={k}>{inner}</s>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Pratinjau pesan seperti gelembung chat WhatsApp. */
export function WaPreview({ text, time = '16.00' }: { text: string; time?: string }) {
  const lines = text.split('\n');
  return (
    <div className="rounded-2xl p-3 sm:p-4" style={{ backgroundColor: '#efeae2', backgroundImage: 'radial-gradient(rgb(0 0 0 / 0.035) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
      <div className="relative ml-auto max-w-[95%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 pb-5 pt-2 text-[13.5px] leading-[1.45] text-[#111b21] shadow-sm">
        {lines.map((l, idx) => {
          if (l.startsWith('> ')) {
            return <div key={idx} className="border-l-[3px] border-[#25a366] bg-black/[0.04] pl-2 text-[#3b4a54]">{inline(l.slice(2), `l${idx}`)}</div>;
          }
          if (l === '') return <div key={idx} className="h-2" />;
          return <div key={idx} className="whitespace-pre-wrap break-words">{inline(l, `l${idx}`)}</div>;
        })}
        <span className="absolute bottom-1 right-2 flex items-center gap-1 text-[10.5px] text-[#667781]">{time} <CheckCheck className="size-3.5 text-[#53bdeb]" /></span>
      </div>
    </div>
  );
}
