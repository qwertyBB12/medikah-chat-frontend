import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="bg-inst-blue px-6 pt-14 pb-10">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="font-semibold text-[15px] text-white leading-relaxed mb-4">
            Medikah Corporation · Incorporated in Delaware, USA
          </p>
          <div className="text-sm space-y-1">
            <p>
              <a
                href="mailto:partnerships@medikah.health"
                className="text-clinical-teal hover:text-white transition-colors"
              >
                partnerships@medikah.health
              </a>
            </p>
            <p>
              <a
                href="mailto:support@medikah.health"
                className="text-clinical-teal hover:text-white transition-colors"
              >
                support@medikah.health
              </a>
            </p>
            <p>
              <a
                href="mailto:legal@medikah.health"
                className="text-clinical-teal hover:text-white transition-colors"
              >
                legal@medikah.health
              </a>
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-white/60">
            &copy; 2026 Medikah Corporation. All rights reserved.
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
