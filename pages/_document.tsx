import { Html, Head, Main, NextScript } from 'next/document';
import { mulish, ibmPlexMono } from '../lib/fonts';

export default function Document() {
  return (
    <Html>
      <Head />
      <body className={`${mulish.variable} ${ibmPlexMono.variable} font-body`}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
