import GitHubProvider, { GitHubProviderOptions } from './providers/githubProvider.js';
import RecordManager, { RecordManagerOptions } from './core/recordManager.js';

async function main() {
  // Define options for GitHubProvider
  const options: GitHubProviderOptions = {
    token: process.env.GITHUB_TOKEN as string,
    owner: process.env.GITHUB_OWNER as string,
    repo: process.env.GITHUB_REPO as string,
    committerName: process.env.GITHUB_NAME as string,
    committerEmail: process.env.GITHUB_EMAIL as string,
  };

  // Create GitHubProvider
  const githubProvider = new GitHubProvider(options);
  
  // Define RecordManagerOptions
  const recordManagerOptions: RecordManagerOptions = {
    storageProvider: githubProvider,  // Pass the GitHubProvider as the storageProvider
    folderId: 'main',  // Use 'main' as folderId
    cacheSize: 50  // Optional: specify cache size
  };

  // Create RecordManager with options
  const recordManager = new RecordManager(recordManagerOptions);
  
  // Create a test record
  const record = { id: 'test-record', name: 'Test Record', data: 'Some test data' };
  
  // Add record via RecordManager
  await recordManager.createRecord(record);
}

// Execute the main function and catch any errors
main().catch(console.error);

