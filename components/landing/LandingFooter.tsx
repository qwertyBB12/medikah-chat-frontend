import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="bg-inst-blue px-6 pt-14 pb-10">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="font-semibold text-[15px] text-white leading-relaxed mb-4">
            Independent Pan-American Health Infrastructure
          </p>
          <p className="text-sm">
            <a
              href="mailto:partnerships@medikah.org"
              className="text-clinical-teal hover:text-white transition-colors"
            >
              partnerships@medikah.org
            </a>
          </p>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-white/60">
            &copy; 2026 Medikah | Established 2022
          </p>
          <div className="text-[13px]">
            <Link href="/privacy" className="text-white/60 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <span className="text-white/30 mx-2">|</span>
            <Link href="/terms" className="text-white/60 hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
