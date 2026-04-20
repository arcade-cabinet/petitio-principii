export interface WikipediaArticle {
  title: string;
  extract: string;
  url: string;
}

export async function fetchFallacyArticle(_fallacyName: string): Promise<WikipediaArticle | null> {
  // TODO: Implement live Wikipedia API calls
  return null;
}
