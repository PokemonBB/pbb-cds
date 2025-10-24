const { getContentListing, countUniqueFiles } = require('./content');

class ContentCache {
  constructor() {
    this.cache = null;
  }

  async loadCache() {
    try {
      console.log('Loading content cache...');
      
      const startTime = Date.now();
      const content = await getContentListing();
      const totalFiles = await countUniqueFiles();
      const endTime = Date.now();
      
      this.cache = {
        success: true,
        content,
        totalFiles
      };
      
      console.log(`Content cache loaded successfully in ${endTime - startTime}ms`);
      console.log(`Cached ${content.length} items and ${totalFiles} files`);
      
      return this.cache;
    } catch (error) {
      console.error('Error loading content cache:', error);
      throw error;
    }
  }

  getCache() {
    if (!this.cache) {
      throw new Error('Cache not loaded. Call loadCache() first.');
    }
    
    return this.cache;
  }

  isLoaded() {
    return this.cache !== null;
  }
}

// Singleton instance
const contentCache = new ContentCache();

module.exports = { contentCache };
