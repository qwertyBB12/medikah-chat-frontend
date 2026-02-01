import { createClient } from '@sanity/client';

export const sanityClient = createClient({
  projectId: 'fo6n8ceo',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
});
