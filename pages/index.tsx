import Head from 'next/head';
import Hero from '../components/landing/Hero';
import Values from '../components/landing/Values';
import Audiences from '../components/landing/Audiences';
import CrossBorder from '../components/landing/CrossBorder';
import Governance from '../components/landing/Governance';
import ClosingStatement from '../components/landing/ClosingStatement';
import Waitlist from '../components/landing/Waitlist';
import LandingFooter from '../components/landing/LandingFooter';

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>Medikah — Healthcare That Crosses Borders</title>
        <meta
          name="description"
          content="Medikah coordinates quality healthcare across the Americas with continuity, compliance, and humanity."
        />
      </Head>

      <main className="font-body">
        <Hero />
        <Values />
        <Audiences />
        <CrossBorder />
        <Governance />
        {/* Future: Medikah Institutional Research section
            (white papers, policy briefs, clinical case studies)
            attributed to "Medikah Research" — not founder narrative content */}
        <ClosingStatement />
        <Waitlist />
        <LandingFooter />
      </main>
    </>
  );
}
