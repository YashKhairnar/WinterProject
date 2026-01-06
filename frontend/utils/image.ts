/**
 * Processes image URLs for production use
 * @param url - The image URL to process
 * @returns The corrected URL or null if input is null/undefined
 */
export const getImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;

    // No local fallbacks allowed in production
    return url;
};
