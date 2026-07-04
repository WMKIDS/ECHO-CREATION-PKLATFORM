/**
 * Fetches articles from the Strapi backend.
 * @returns {Promise<Array>} The array of articles or an empty array if an error occurs.
 */
async function fetchArticles() {
    try {
        const response = await fetch('http://localhost:1337/api/articles?populate=*');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.data; // Assuming Strapi v4 standard response structure
    } catch (error) {
        console.error("Could not fetch articles:", error);
        return []; // Return empty array on error so UI can handle it gracefully
    }
}
