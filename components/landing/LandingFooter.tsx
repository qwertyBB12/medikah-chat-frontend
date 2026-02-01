export default function LandingFooter() {
  return (
    <footer className="bg-navy-900 px-6 py-10 border-t border-cream-500/10">
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <p className="font-body text-xs text-cream-300/30">
          &copy; {new Date().getFullYear()} Medikah
        </p>
        <p className="font-body text-xs text-cream-300/15">
          A BeNeXT Global service
        </p>
      </div>
    </footer>
  );
}
