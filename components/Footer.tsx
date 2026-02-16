import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Footer() {
  const router = useRouter();
  const isEs = router.locale === 'es';

  return (
    <footer className="font-dm-sans px-6 py-4 text-center text-[13px] text-body-slate leading-relaxed bg-clinical-surface/40 space-y-1">
      <p>{isEs ? 'Sus conversaciones se manejan con cuidado y encriptación.' : 'Your conversations are encrypted and handled with care.'}</p>
      <p>{isEs ? 'Profesionales autorizados pueden revisar cuando sea necesario.' : 'Licensed professionals may review when needed to ensure safe guidance.'}</p>
      <div className="flex items-center justify-center gap-2 text-archival-grey text-[11px] pt-1">
        <span>&copy; {new Date().getFullYear()} Medikah Corporation</span>
        <span>·</span>
        <Link href="/privacy" className="hover:text-body-slate transition">{isEs ? 'Privacidad' : 'Privacy Policy'}</Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-body-slate transition">{isEs ? 'Términos' : 'Terms of Service'}</Link>
      </div>
    </footer>
  );
}
