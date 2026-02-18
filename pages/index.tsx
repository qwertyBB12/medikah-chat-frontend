import Head from 'next/head';
import Nav from '../components/landing/Nav';
import Hero from '../components/landing/Hero';
import CurveDivider from '../components/landing/CurveDivider';
import HowItWorks from '../components/landing/HowItWorks';
import HorizontalStats from '../components/landing/HorizontalStats';
import Monument from '../components/landing/Monument';
import StaggeredGrid from '../components/landing/StaggeredGrid';
import ChatShowcase from '../components/landing/ChatShowcase';
import DarkFeatures from '../components/landing/DarkFeatures';
import Collaborators from '../components/landing/Collaborators';
import CTAMonument from '../components/landing/CTAMonument';
import RegulatoryDisclosure from '../components/landing/RegulatoryDisclosure';
import Waitlist from '../components/landing/Waitlist';
import LandingFooter from '../components/landing/LandingFooter';

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>Medikah — Connect With Physicians Across Borders</title>
        <meta name="description" content="Medikah coordinates healthcare across the Americas with continuity, compliance, and institutional rigor." />
        <link rel="canonical" href="https://medikah.health/" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://medikah.health/" />
        <meta property="og:title" content="Medikah — Connect With Physicians Across Borders" />
        <meta property="og:description" content="Medikah coordinates healthcare across the Americas with continuity, compliance, and institutional rigor." />
        <meta property="og:image" content="https://medikah.health/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Medikah" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Medikah — Connect With Physicians Across Borders" />
        <meta name="twitter:description" content="Medikah coordinates healthcare across the Americas with continuity, compliance, and institutional rigor." />
        <meta name="twitter:image" content="https://medikah.health/og-image.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'MedicalOrganization',
              name: 'Medikah',
              url: 'https://medikah.health',
              logo: 'https://medikah.health/logo-app-icon.png',
              description: 'Medikah is a HIPAA-compliant cross-border health coordination platform connecting patients across the Americas with licensed healthcare providers via secure telehealth consultations.',
              foundingDate: '2022',
              areaServed: 'Americas',
              medicalSpecialty: 'Cross-Border Healthcare Coordination',
              contactPoint: {
                '@type': 'ContactPoint',
                email: 'support@medikah.health',
                contactType: 'customer support',
              },
              sameAs: [],
            }),
          }}
        />
      </Head>

      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <Nav />

      <main id="main-content" className="font-body bg-linen" style={{ scrollBehavior: 'smooth' }}>
        {/* 1. Hero — warm gray gradient, CARE THAT / CROSSES BORDERS */}
        <Hero />

        {/* Curve: dark to linen */}
        <CurveDivider from="#0D1520" bg="#F0EAE0" />

        {/* 2. How It Works — split pinned/scrolling */}
        <HowItWorks />

        {/* Curve: linen-warm to dark */}
        <CurveDivider from="#E8E0D5" bg="#1B2A41" flip />

        {/* 3. Horizontal Stats — scroll-jacked */}
        <HorizontalStats />

        {/* 4. Monument — 24/7 */}
        <Monument />

        {/* Curve: linen to linen-light */}
        <CurveDivider from="#F0EAE0" bg="#F5F1EA" />

        {/* 5. Staggered Grid — Patient & Physician cards */}
        <StaggeredGrid />

        {/* 6. Chat UI Showcase — THE MEDIKAH EXPERIENCE */}
        <ChatShowcase />

        {/* Curve: linen-warm to dark */}
        <CurveDivider from="#E8E0D5" bg="#1B2A41" flip />

        {/* 7. Dark Features — The Platform */}
        <DarkFeatures />

        {/* 8. Collaborators */}
        <Collaborators />

        {/* 9. CTA Monument */}
        <CTAMonument />

        {/* Regulatory disclosure */}
        <RegulatoryDisclosure />

        {/* Waitlist */}
        <Waitlist />

        {/* Footer — warm gray gradient, rounded top */}
        <LandingFooter />
      </main>
    </>
  );
}
