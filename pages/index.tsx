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

      <Nav />

      <main className="font-body pt-20">
        <Hero />
        <Values />
        <WhyExists />
        <Audiences />
        <Architecture />
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
