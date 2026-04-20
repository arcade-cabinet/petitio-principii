export interface WikipediaArticle {
  title: string;
  extract: string;
  url: string;
}

export async function fetchFallacyArticle(_fallacyName: string): Promise<WikipediaArticle | null> {
  try {
    // TODO: Implement live Wikipedia API calls
    return null;
  } catch (error) {
    console.error("Failed to fetch Wikipedia article:", error);
    return null;
  }
}
