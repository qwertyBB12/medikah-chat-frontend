import { Raleway, Sora } from 'next/font/google';

export const raleway = Raleway({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-raleway',
  display: 'swap'
});

export const sora = Sora({
  subsets: ['latin'],
  weight: ['800'],
  variable: '--font-sora',
  display: 'swap'
});
