import { Html, Head, Main, NextScript } from 'next/document';
import { raleway, sora } from '../lib/fonts';

export default function Document() {
  return (
    <Html>
      <Head />
      <body className={`${raleway.variable} ${sora.variable} font-body`}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
