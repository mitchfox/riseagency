export const createPerformanceReportSlug = (
  playerName: string, 
  opponent: string, 
  analysisId: string
): string => {
  // Create a readable slug from player name and opponent
  const slugParts = [
    playerName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    'vs',
    opponent.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  ];
  
  const slug = slugParts.join('-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  
  return `/performance-report/${slug}-${analysisId}`;
};

export const extractAnalysisIdFromSlug = (slug: string): string => {
  // Extract UUID from the end of the slug
  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;
  const match = slug.match(uuidRegex);
  
  if (match) {
    return match[1];
  }
  
  // Fallback: if no UUID found, assume the whole slug is the UUID (backwards compatibility)
  return slug;
};
