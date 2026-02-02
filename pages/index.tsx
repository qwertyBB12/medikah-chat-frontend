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
  // Fetch only leadership, Americas, and healthcare-relevant content.
  // Once the Sanity schema includes a `healthcareRelevant` boolean field,
  // add `&& healthcareRelevant == true` to this filter.
  let perspectives: SanityPerspective[] = [];
  try {
    const all: SanityPerspective[] = await sanityClient.fetch(
      `*[_type in ["essay","opEd","video","podcastEpisode"]] | order(_createdAt desc)[0..50]{
        _id, _type, title, slug, language, narrativeOwner
      }`
    );

    const ALLOWED_KEYWORDS = [
      'healthcare', 'health', 'medical', 'clinical', 'hospital',
      'physician', 'patient', 'care', 'insurance', 'telemedicine',
      'leadership', 'americas', 'latin america', 'hemispheric',
      'cross-border', 'coordination', 'salud', 'médico', 'paciente',
    ];

    perspectives = all.filter((item) => {
      const text = `${item.title} ${item.narrativeOwner ?? ''}`.toLowerCase();
      return ALLOWED_KEYWORDS.some((kw) => text.includes(kw));
    }).slice(0, 12);
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
