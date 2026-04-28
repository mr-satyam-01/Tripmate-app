export function calculateCompatibility(userInterests: string[] | null, otherInterests: string[] | null): number {
  if (!userInterests || !otherInterests || userInterests.length === 0 || otherInterests.length === 0) {
    return 0;
  }
  
  const userSet = new Set(userInterests.map(i => i.toLowerCase().trim()));
  let matchCount = 0;
  
  otherInterests.forEach(interest => {
    if (userSet.has(interest.toLowerCase().trim())) {
      matchCount++;
    }
  });

  // Calculate percentage based on the maximum possible matches
  // If user has 5 interests and other has 2, max possible matches for the other is 2.
  // Actually, standard Jaccard index or simple percentage of current user's interests:
  const score = Math.round((matchCount / Math.max(userInterests.length, 1)) * 100);
  
  // Cap at 100% just in case
  return Math.min(score, 100);
}
