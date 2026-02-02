import Head from 'next/head';
import Hero from '../components/landing/Hero';
import Values from '../components/landing/Values';
import Audiences from '../components/landing/Audiences';
import CrossBorder from '../components/landing/CrossBorder';
import Governance from '../components/landing/Governance';
import Perspectives from '../components/landing/Perspectives';
import ClosingStatement from '../components/landing/ClosingStatement';
import Waitlist from '../components/landing/Waitlist';
import LandingFooter from '../components/landing/LandingFooter';
import { sanityClient } from '../lib/sanity';
import { SanityPerspective } from '../components/landing/Perspectives';

interface Props {
  perspectives: SanityPerspective[];
}

export async function getStaticProps() {
  let perspectives: SanityPerspective[] = [];
  try {
    perspectives = await sanityClient.fetch(
      `*[_type in ["essay","opEd","video","podcastEpisode"]] | order(_createdAt desc)[0..11]{
        _id, _type, title, slug, language, narrativeOwner
      }`
    );
  } catch {
    perspectives = [];
  }

  return {
    props: { perspectives },
    revalidate: 60,
  };
}

export default function LandingPage({ perspectives }: Props) {
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
        <Perspectives items={perspectives} />
        <ClosingStatement />
        <Waitlist />
        <LandingFooter />
      </main>
    </>
  );
}
