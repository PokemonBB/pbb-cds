const fastify = require('fastify')({ logger: true });
const fs = require('fs-extra');
const path = require('path');
const yauzl = require('yauzl');

const PORT = process.env.PORT || 3000;
const CONTENT_ZIP_PATH = path.join(__dirname, 'CONTENT.zip');
const CONTENT_DIR_PATH = path.join(__dirname, 'CONTENT');

async function extractContentZip() {
  try {
    if (!await fs.pathExists(CONTENT_ZIP_PATH)) {
      throw new Error('CONTENT.zip not found in root directory');
    }

    if (await fs.pathExists(CONTENT_DIR_PATH)) {
      await fs.remove(CONTENT_DIR_PATH);
    }

    await fs.ensureDir(CONTENT_DIR_PATH);

    return new Promise((resolve, reject) => {
      yauzl.open(CONTENT_ZIP_PATH, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }

        zipfile.readEntry();
        zipfile.on('entry', (entry) => {
          if (/\/$/.test(entry.fileName)) {
            zipfile.readEntry();
            return;
          }

          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(err);
              return;
            }

            const filePath = path.join(CONTENT_DIR_PATH, entry.fileName);
            fs.ensureDir(path.dirname(filePath)).then(() => {
              const writeStream = fs.createWriteStream(filePath);
              readStream.pipe(writeStream);
              writeStream.on('close', () => {
                zipfile.readEntry();
              });
            });
          });
        });

        zipfile.on('end', () => {
          console.log('Content extracted successfully');
          resolve();
        });

        zipfile.on('error', reject);
      });
    });
  } catch (error) {
    console.error('Error extracting content:', error);
    process.exit(1);
  }
}

async function getContentListing() {
  try {
    const listing = [];
    
    async function listDirectoryRecursively(dirPath, relativePath = '') {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        const itemRelativePath = relativePath ? path.join(relativePath, item.name) : item.name;
        const stats = await fs.stat(itemPath);
        
        listing.push({
          name: item.name,
          path: itemRelativePath,
          type: item.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime
        });
        
        if (item.isDirectory()) {
          await listDirectoryRecursively(itemPath, itemRelativePath);
        }
      }
    }
    
    await listDirectoryRecursively(CONTENT_DIR_PATH);
    return listing;
  } catch (error) {
    throw new Error(`Error reading content directory: ${error.message}`);
  }
}

async function countUniqueFiles() {
  try {
    let fileCount = 0;
    
    async function countFilesRecursively(dirPath) {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          await countFilesRecursively(itemPath);
        } else {
          fileCount++;
        }
      }
    }
    
    await countFilesRecursively(CONTENT_DIR_PATH);
    return fileCount;
  } catch (error) {
    throw new Error(`Error counting files: ${error.message}`);
  }
}

fastify.get('/api/content', async (request, reply) => {
  try {
    const contentListing = await getContentListing();
    const totalFiles = await countUniqueFiles();
    
    return {
      success: true,
      content: contentListing,
      totalFiles: totalFiles
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});

fastify.get('/health', async (request, reply) => {
  return { status: 'OK', service: 'PBB-CDS' };
});

async function startServer() {
  try {
    console.log('Starting PBB Content Distribution System...');
    console.log('Extracting CONTENT.zip...');
    
    await extractContentZip();
    
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`PBB-CDS server running on port ${PORT}`);
    console.log(`Content API available at: http://localhost:${PORT}/api/content`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
