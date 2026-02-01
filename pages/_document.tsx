import { Html, Head, Main, NextScript } from 'next/document';
import { oswald, mulish } from '../lib/fonts';

export default function Document() {
  return (
    <Html>
      <Head />
      <body className={`${oswald.variable} ${mulish.variable} font-body`}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
