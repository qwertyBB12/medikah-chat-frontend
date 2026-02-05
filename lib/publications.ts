/**
 * Research Publications Service
 *
 * Fetches publications from multiple sources:
 * - PubMed (NCBI E-utilities API)
 * - ResearchGate (web scraping)
 * - Academia.edu (web scraping)
 * - Manual entry
 */

// Publication types
export type PublicationSource = 'pubmed' | 'researchgate' | 'academia' | 'scholar' | 'manual';

export interface Publication {
  id?: string;
  title: string;
  authors?: string;
  journal?: string;
  year?: number;
  doi?: string;
  url?: string;
  abstract?: string;
  citationCount?: number;
  source: PublicationSource;
  externalId?: string; // PMID, RG ID, etc.
  includedInProfile: boolean;
}

export interface PublicationFetchResult {
  success: boolean;
  publications: Publication[];
  totalCount?: number;
  profileUrl?: string;
  profileName?: string;
  error?: string;
}

// =============================================================================
// PubMed API (NCBI E-utilities)
// =============================================================================

const PUBMED_SEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const PUBMED_FETCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const PUBMED_SUMMARY_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';

/**
 * Search PubMed by author name
 */
export async function searchPubMedByAuthor(
  authorName: string,
  maxResults: number = 50
): Promise<PublicationFetchResult> {
  try {
    // Format author name for PubMed search (Last FM)
    const formattedName = formatAuthorForPubMed(authorName);

    // Step 1: Search for article IDs
    const searchParams = new URLSearchParams({
      db: 'pubmed',
      term: `${formattedName}[Author]`,
      retmax: maxResults.toString(),
      retmode: 'json',
      sort: 'pub_date',
    });

    const searchResponse = await fetch(`${PUBMED_SEARCH_URL}?${searchParams}`);
    if (!searchResponse.ok) {
      throw new Error('PubMed search failed');
    }

    const searchData = await searchResponse.json();
    const pmids: string[] = searchData.esearchresult?.idlist || [];

    if (pmids.length === 0) {
      return {
        success: true,
        publications: [],
        totalCount: 0,
        profileName: authorName,
      };
    }

    // Step 2: Fetch article summaries
    const summaryParams = new URLSearchParams({
      db: 'pubmed',
      id: pmids.join(','),
      retmode: 'json',
    });

    const summaryResponse = await fetch(`${PUBMED_SUMMARY_URL}?${summaryParams}`);
    if (!summaryResponse.ok) {
      throw new Error('PubMed summary fetch failed');
    }

    const summaryData = await summaryResponse.json();
    const articles = summaryData.result || {};

    // Parse publications
    const publications: Publication[] = pmids
      .filter(pmid => articles[pmid])
      .map(pmid => {
        const article = articles[pmid];
        return {
          title: article.title || 'Untitled',
          authors: article.authors?.map((a: { name: string }) => a.name).join(', '),
          journal: article.fulljournalname || article.source,
          year: parseInt(article.pubdate?.split(' ')[0]) || undefined,
          doi: extractDoi(article.elocationid),
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
          source: 'pubmed' as PublicationSource,
          externalId: pmid,
          includedInProfile: true, // Default to included
        };
      });

    return {
      success: true,
      publications,
      totalCount: parseInt(searchData.esearchresult?.count) || publications.length,
      profileName: authorName,
    };
  } catch (error) {
    console.error('PubMed search error:', error);
    return {
      success: false,
      publications: [],
      error: error instanceof Error ? error.message : 'PubMed search failed',
    };
  }
}

/**
 * Fetch PubMed articles by author ID (if they have one)
 */
export async function fetchPubMedByAuthorId(
  authorId: string,
  maxResults: number = 50
): Promise<PublicationFetchResult> {
  // PubMed author IDs look like "ORCID:0000-0001-2345-6789" or just the ORCID
  const cleanId = authorId.replace(/^orcid:/i, '').trim();

  try {
    const searchParams = new URLSearchParams({
      db: 'pubmed',
      term: `${cleanId}[auid]`,
      retmax: maxResults.toString(),
      retmode: 'json',
      sort: 'pub_date',
    });

    const searchResponse = await fetch(`${PUBMED_SEARCH_URL}?${searchParams}`);
    if (!searchResponse.ok) {
      // Fall back to name search
      return searchPubMedByAuthor(authorId, maxResults);
    }

    const searchData = await searchResponse.json();
    const pmids: string[] = searchData.esearchresult?.idlist || [];

    if (pmids.length === 0) {
      // Try name search as fallback
      return searchPubMedByAuthor(authorId, maxResults);
    }

    // Fetch summaries (same as above)
    const summaryParams = new URLSearchParams({
      db: 'pubmed',
      id: pmids.join(','),
      retmode: 'json',
    });

    const summaryResponse = await fetch(`${PUBMED_SUMMARY_URL}?${summaryParams}`);
    const summaryData = await summaryResponse.json();
    const articles = summaryData.result || {};

    const publications: Publication[] = pmids
      .filter(pmid => articles[pmid])
      .map(pmid => {
        const article = articles[pmid];
        return {
          title: article.title || 'Untitled',
          authors: article.authors?.map((a: { name: string }) => a.name).join(', '),
          journal: article.fulljournalname || article.source,
          year: parseInt(article.pubdate?.split(' ')[0]) || undefined,
          doi: extractDoi(article.elocationid),
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
          source: 'pubmed' as PublicationSource,
          externalId: pmid,
          includedInProfile: true,
        };
      });

    return {
      success: true,
      publications,
      totalCount: parseInt(searchData.esearchresult?.count) || publications.length,
    };
  } catch (error) {
    console.error('PubMed author ID search error:', error);
    return {
      success: false,
      publications: [],
      error: error instanceof Error ? error.message : 'PubMed search failed',
    };
  }
}

// =============================================================================
// ResearchGate Scraping
// =============================================================================

/**
 * Fetch publications from ResearchGate profile
 * Note: ResearchGate doesn't have a public API, so we parse the HTML
 */
export async function fetchResearchGatePublications(
  profileUrl: string
): Promise<PublicationFetchResult> {
  try {
    // Validate ResearchGate URL
    if (!isValidResearchGateUrl(profileUrl)) {
      return {
        success: false,
        publications: [],
        error: 'Invalid ResearchGate URL',
      };
    }

    // Normalize URL to publications page
    const publicationsUrl = normalizeResearchGateUrl(profileUrl);

    // Fetch the page
    const response = await fetch(publicationsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Medikah/1.0; +https://medikah.health)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ResearchGate profile: ${response.status}`);
    }

    const html = await response.text();

    // Parse publications from HTML
    const publications = parseResearchGateHtml(html);

    // Extract profile name
    const profileName = extractResearchGateProfileName(html);

    return {
      success: true,
      publications,
      totalCount: publications.length,
      profileUrl,
      profileName,
    };
  } catch (error) {
    console.error('ResearchGate fetch error:', error);
    return {
      success: false,
      publications: [],
      error: error instanceof Error ? error.message : 'Failed to fetch ResearchGate profile',
    };
  }
}

/**
 * Parse ResearchGate HTML to extract publications
 * Note: This is fragile and may break if RG changes their HTML structure
 */
function parseResearchGateHtml(html: string): Publication[] {
  const publications: Publication[] = [];

  // ResearchGate uses JSON-LD for structured data
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);

  if (jsonLdMatch) {
    for (const match of jsonLdMatch) {
      try {
        const jsonStr = match
          .replace(/<script type="application\/ld\+json">/, '')
          .replace(/<\/script>/, '');
        const data = JSON.parse(jsonStr);

        if (data['@type'] === 'ScholarlyArticle' || data['@type'] === 'Article') {
          publications.push({
            title: data.headline || data.name || 'Untitled',
            authors: Array.isArray(data.author)
              ? data.author.map((a: { name?: string }) => a.name || '').join(', ')
              : data.author?.name,
            journal: data.isPartOf?.name,
            year: data.datePublished ? new Date(data.datePublished).getFullYear() : undefined,
            doi: data.sameAs?.find((url: string) => url.includes('doi.org'))?.replace('https://doi.org/', ''),
            url: data.url || data.mainEntityOfPage,
            abstract: data.description,
            source: 'researchgate',
            includedInProfile: true,
          });
        }
      } catch {
        // JSON parsing failed, continue
      }
    }
  }

  // Fallback: Parse HTML directly using regex (less reliable)
  if (publications.length === 0) {
    // Look for publication items in the HTML
    const pubRegex = /<div[^>]*class="[^"]*publication-item[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const titleRegex = /<a[^>]*class="[^"]*publication-title[^"]*"[^>]*>([^<]+)<\/a>/i;

    let match;
    while ((match = pubRegex.exec(html)) !== null) {
      const item = match[1];
      const titleMatch = item.match(titleRegex);

      if (titleMatch) {
        publications.push({
          title: decodeHtmlEntities(titleMatch[1]),
          source: 'researchgate',
          includedInProfile: true,
        });
      }
    }
  }

  return publications;
}

function extractResearchGateProfileName(html: string): string | undefined {
  // Try to extract from meta tags
  const nameMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
  if (nameMatch) {
    return nameMatch[1].replace(/'s research/i, '').trim();
  }
  return undefined;
}

function isValidResearchGateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('researchgate.net');
  } catch {
    return false;
  }
}

function normalizeResearchGateUrl(url: string): string {
  // Ensure we're looking at the publications page
  if (!url.includes('/publications')) {
    return url.replace(/\/?$/, '/publications');
  }
  return url;
}

// =============================================================================
// Academia.edu Scraping
// =============================================================================

/**
 * Fetch publications from Academia.edu profile
 */
export async function fetchAcademiaPublications(
  profileUrl: string
): Promise<PublicationFetchResult> {
  try {
    // Validate Academia.edu URL
    if (!isValidAcademiaUrl(profileUrl)) {
      return {
        success: false,
        publications: [],
        error: 'Invalid Academia.edu URL',
      };
    }

    // Fetch the page
    const response = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Medikah/1.0; +https://medikah.health)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Academia.edu profile: ${response.status}`);
    }

    const html = await response.text();

    // Parse publications from HTML
    const publications = parseAcademiaHtml(html);

    // Extract profile name
    const profileName = extractAcademiaProfileName(html);

    return {
      success: true,
      publications,
      totalCount: publications.length,
      profileUrl,
      profileName,
    };
  } catch (error) {
    console.error('Academia.edu fetch error:', error);
    return {
      success: false,
      publications: [],
      error: error instanceof Error ? error.message : 'Failed to fetch Academia.edu profile',
    };
  }
}

/**
 * Parse Academia.edu HTML to extract publications
 */
function parseAcademiaHtml(html: string): Publication[] {
  const publications: Publication[] = [];

  // Academia.edu uses JSON-LD
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);

  if (jsonLdMatch) {
    for (const match of jsonLdMatch) {
      try {
        const jsonStr = match
          .replace(/<script type="application\/ld\+json">/, '')
          .replace(/<\/script>/, '');
        const data = JSON.parse(jsonStr);

        if (data['@type'] === 'ScholarlyArticle' || data['@graph']) {
          const articles = data['@graph']?.filter(
            (item: { '@type': string }) => item['@type'] === 'ScholarlyArticle'
          ) || [data];

          for (const article of articles) {
            if (article['@type'] === 'ScholarlyArticle') {
              publications.push({
                title: article.headline || article.name || 'Untitled',
                authors: Array.isArray(article.author)
                  ? article.author.map((a: { name?: string }) => a.name || '').join(', ')
                  : article.author?.name,
                year: article.datePublished ? new Date(article.datePublished).getFullYear() : undefined,
                url: article.url,
                abstract: article.description,
                source: 'academia',
                includedInProfile: true,
              });
            }
          }
        }
      } catch {
        // JSON parsing failed
      }
    }
  }

  // Fallback: Basic HTML parsing
  if (publications.length === 0) {
    const titleRegex = /<a[^>]*class="[^"]*paper-title[^"]*"[^>]*>([^<]+)<\/a>/gi;
    let match;

    while ((match = titleRegex.exec(html)) !== null) {
      publications.push({
        title: decodeHtmlEntities(match[1]),
        source: 'academia',
        includedInProfile: true,
      });
    }
  }

  return publications;
}

function extractAcademiaProfileName(html: string): string | undefined {
  const nameMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
  if (nameMatch) {
    return nameMatch[1].split('|')[0].trim();
  }
  return undefined;
}

function isValidAcademiaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('academia.edu');
  } catch {
    return false;
  }
}

// =============================================================================
// Helpers
// =============================================================================

function formatAuthorForPubMed(name: string): string {
  // Convert "John Smith" to "Smith J" for PubMed
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const lastName = parts[parts.length - 1];
    const firstInitial = parts[0][0];
    return `${lastName} ${firstInitial}`;
  }
  return name;
}

function extractDoi(elocationId: string | undefined): string | undefined {
  if (!elocationId) return undefined;
  const doiMatch = elocationId.match(/doi:\s*(10\.\d{4,}\/[^\s]+)/i);
  return doiMatch ? doiMatch[1] : undefined;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// =============================================================================
// Manual Entry Validation
// =============================================================================

/**
 * Validate and format a manually entered publication
 */
export function createManualPublication(data: {
  title: string;
  journal?: string;
  year?: number;
  doi?: string;
  url?: string;
}): Publication {
  return {
    title: data.title.trim(),
    journal: data.journal?.trim(),
    year: data.year,
    doi: data.doi?.trim(),
    url: data.url?.trim() || (data.doi ? `https://doi.org/${data.doi}` : undefined),
    source: 'manual',
    includedInProfile: true,
  };
}

/**
 * Validate DOI format
 */
export function isValidDoi(doi: string): boolean {
  // DOI format: 10.XXXX/suffix
  return /^10\.\d{4,}\/[^\s]+$/.test(doi.trim());
}

/**
 * Format publication for display
 */
export function formatPublicationCitation(pub: Publication): string {
  const parts: string[] = [];

  if (pub.authors) {
    parts.push(pub.authors);
  }

  if (pub.year) {
    parts.push(`(${pub.year})`);
  }

  parts.push(pub.title);

  if (pub.journal) {
    parts.push(`*${pub.journal}*`);
  }

  if (pub.doi) {
    parts.push(`DOI: ${pub.doi}`);
  }

  return parts.join('. ');
}
