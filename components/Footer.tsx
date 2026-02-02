import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="px-6 py-4 text-center text-[13px] text-body-slate leading-relaxed bg-clinical-surface/40 space-y-1">
      <p>Your conversations are encrypted and handled with care.</p>
      <p>Licensed professionals may review when needed to ensure safe guidance.</p>
      <p className="text-archival-grey text-[11px]">
        <Link href="/privacy" className="hover:text-body-slate transition">Privacy Policy</Link>
        <span className="mx-1.5">·</span>
        <Link href="/terms" className="hover:text-body-slate transition">Terms of Service</Link>
      </p>
    </footer>
  );
}
