import Head from 'next/head';
import Nav from '../components/landing/Nav';
import Hero from '../components/landing/Hero';
import Values from '../components/landing/Values';
import WhyExists from '../components/landing/WhyExists';
import Audiences from '../components/landing/Audiences';
import Architecture from '../components/landing/Architecture';
import CrossBorder from '../components/landing/CrossBorder';
import Governance from '../components/landing/Governance';
import ClosingStatement from '../components/landing/ClosingStatement';
import RegulatoryDisclosure from '../components/landing/RegulatoryDisclosure';
import Waitlist from '../components/landing/Waitlist';
import LandingFooter from '../components/landing/LandingFooter';
import FadeInSection from '../components/landing/FadeInSection';

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

      <main id="main-content" className="font-body pt-20 landing-sections">
        <Hero />
        <FadeInSection><Values /></FadeInSection>
        <FadeInSection><WhyExists /></FadeInSection>
        <FadeInSection><Audiences /></FadeInSection>
        <FadeInSection><Architecture /></FadeInSection>
        <FadeInSection><CrossBorder /></FadeInSection>
        <FadeInSection><Governance /></FadeInSection>
        {/* Future: Medikah Institutional Research section
            (white papers, policy briefs, clinical case studies)
            attributed to "Medikah Research" — not founder narrative content */}
        <FadeInSection><ClosingStatement /></FadeInSection>
        <RegulatoryDisclosure />
        <Waitlist />
        <LandingFooter />
      </main>
    </>
  );
}
