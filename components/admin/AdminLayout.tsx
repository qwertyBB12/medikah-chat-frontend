import { ReactNode, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { LOGO_SRC } from '../../lib/assets';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  children: ReactNode;
  adminName: string;
  pendingReviewCount?: number;
}

export default function AdminLayout({ children, adminName, pendingReviewCount = 0 }: AdminLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row bg-[#FAFAFB] text-deep-charcoal">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-72 lg:w-80 bg-gradient-to-b from-inst-blue to-[#0D1520] text-white md:sticky md:top-0 md:h-screen md:max-h-screen">
        <div className="flex flex-col items-center justify-center py-10 px-6 gap-3">
          <Image
            src={LOGO_SRC}
            alt=""
            width={320}
            height={320}
            priority
            className="w-14 h-auto opacity-80"
          />
          <span className="font-body text-[1.5rem] font-medium tracking-[0.04em] lowercase text-white">
            medikah
          </span>
          <p className="font-dm-sans text-xs text-white/50 text-center mt-1">
            Admin Panel
          </p>
        </div>

        <div className="flex-1 px-6">
          <AdminSidebar pendingReviewCount={pendingReviewCount} />
        </div>

        <div className="px-6 py-4 border-t border-white/10">
          <p className="font-dm-sans text-xs text-white/40 mb-3 truncate">
            {adminName}
          </p>
          <button
            onClick={handleSignOut}
            className="font-dm-sans w-full py-3 text-center text-sm font-medium tracking-wide text-white/60 hover:text-white transition"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden px-4 py-4 bg-gradient-to-r from-inst-blue to-[#0D1520] text-white">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <Image
              src={LOGO_SRC}
              alt=""
              width={96}
              height={96}
              priority
              className="w-8 h-auto opacity-80"
            />
            <span className="font-body text-[1.125rem] font-medium tracking-[0.04em] lowercase text-white">
              medikah
            </span>
            <span className="font-dm-sans text-xs text-white/50 ml-1">Admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="font-dm-sans px-3 py-2 text-xs font-semibold tracking-wide text-white/80 border border-white/20 hover:text-white hover:border-white/30 transition rounded-[8px]"
            >
              {mobileMenuOpen ? 'Close' : 'Menu'}
            </button>
            <button
              onClick={handleSignOut}
              className="font-dm-sans px-3 py-2 text-xs font-semibold tracking-wide text-white/80 border border-white/20 hover:text-white hover:border-white/30 transition rounded-[8px]"
            >
              Sign out
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="mt-4 pb-2">
            <AdminSidebar pendingReviewCount={pendingReviewCount} />
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col bg-[#FAFAFB] md:overflow-y-auto">
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
