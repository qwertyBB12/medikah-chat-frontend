export default function LandingFooter() {
  return (
    <footer className="bg-inst-blue px-6 pt-14 pb-10">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="font-semibold text-sm text-white leading-relaxed mb-4">
            Independent Pan-American Health Infrastructure
            <br />
            Conceived through BeNeXT Global frameworks
          </p>
          <p className="text-sm">
            <a
              href="mailto:partnerships@medikah.com"
              className="text-clinical-teal hover:text-white transition-colors"
            >
              partnerships@medikah.com
            </a>
          </p>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-white/60">
            &copy; 2026 Medikah | Established 2024
          </p>
          <div className="text-[13px]">
            <a href="/privacy" className="text-white/60 hover:text-white transition-colors">
              Privacy Policy
            </a>
            <span className="text-white/30 mx-2">|</span>
            <a href="/terms" className="text-white/60 hover:text-white transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
