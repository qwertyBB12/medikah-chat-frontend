import Head from 'next/head';
import Hero from '../components/landing/Hero';
import Promise from '../components/landing/Promise';
import Waitlist from '../components/landing/Waitlist';
import LandingFooter from '../components/landing/LandingFooter';

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>Medikah</title>
        <meta
          name="description"
          content="Medikah connects patients with doctors across the Americas. Secure bilingual telehealth consultations."
        />
      </Head>

      <main className="font-body">
        <Hero />
        <Promise />
        <Waitlist />
        <LandingFooter />
      </main>
    </>
  );
}
