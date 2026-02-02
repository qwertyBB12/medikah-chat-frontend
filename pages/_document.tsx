import { Html, Head, Main, NextScript } from 'next/document';
import { mulish, ibmPlexMono } from '../lib/fonts';

export default function Document() {
  return (
    <Html>
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/favicon-96x96.png" type="image/png" sizes="96x96" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#1B2A41" />
      </Head>
      <body className={`${mulish.variable} ${ibmPlexMono.variable} font-body`}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
