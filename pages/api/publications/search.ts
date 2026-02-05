/**
 * POST /api/publications/search
 *
 * Search for publications from various sources.
 * Supports: PubMed, ResearchGate, Academia.edu
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  searchPubMedByAuthor,
  fetchPubMedByAuthorId,
  fetchResearchGatePublications,
  fetchAcademiaPublications,
  PublicationFetchResult,
  PublicationSource,
} from '../../../lib/publications';

interface SearchRequest {
  source: PublicationSource;
  query: string; // Author name, profile URL, or author ID
  maxResults?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PublicationFetchResult>
) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      publications: [],
      error: `Method ${req.method} not allowed`,
    });
  }

  const body: SearchRequest = req.body;

  if (!body.source || !body.query) {
    return res.status(400).json({
      success: false,
      publications: [],
      error: 'source and query are required',
    });
  }

  const { source, query, maxResults = 50 } = body;

  try {
    let result: PublicationFetchResult;

    switch (source) {
      case 'pubmed':
        // Check if query looks like an author ID (ORCID or similar)
        if (query.includes('-') || query.match(/^\d+$/)) {
          result = await fetchPubMedByAuthorId(query, maxResults);
        } else {
          result = await searchPubMedByAuthor(query, maxResults);
        }
        break;

      case 'researchgate':
        // Query should be a ResearchGate profile URL
        if (!query.includes('researchgate.net')) {
          return res.status(400).json({
            success: false,
            publications: [],
            error: 'Please provide a valid ResearchGate profile URL',
          });
        }
        result = await fetchResearchGatePublications(query);
        break;

      case 'academia':
        // Query should be an Academia.edu profile URL
        if (!query.includes('academia.edu')) {
          return res.status(400).json({
            success: false,
            publications: [],
            error: 'Please provide a valid Academia.edu profile URL',
          });
        }
        result = await fetchAcademiaPublications(query);
        break;

      default:
        return res.status(400).json({
          success: false,
          publications: [],
          error: `Unsupported source: ${source}. Supported: pubmed, researchgate, academia`,
        });
    }

    // Return results
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Publication search error:', error);
    return res.status(500).json({
      success: false,
      publications: [],
      error: error instanceof Error ? error.message : 'Search failed',
    });
  }
}
