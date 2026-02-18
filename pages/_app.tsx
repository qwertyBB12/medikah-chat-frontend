import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { SessionProvider } from 'next-auth/react';
import { initGA, pageview } from '../lib/analytics';
import { mulish, ibmPlexMono, fraunces, instrumentSerif, inter, playfairDisplay, sourceSans3, dmSerifDisplay, dmSans } from '../lib/fonts';
import '../styles/globals.css';

const fontVars = [
  mulish.variable,
  ibmPlexMono.variable,
  fraunces.variable,
  instrumentSerif.variable,
  inter.variable,
  playfairDisplay.variable,
  sourceSans3.variable,
  dmSerifDisplay.variable,
  dmSans.variable,
].join(' ');

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();

  // Mark that JS is enabled and initialize analytics
  useEffect(() => {
    document.body.classList.add('js-enabled');
    initGA();
  }, []);

  // Track page views on route change
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      pageview(url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return (
    <div className={`${fontVars} font-body`}>
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    </div>
  );
}

export default MyApp;
