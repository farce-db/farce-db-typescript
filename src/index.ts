// src/index.ts
import GitHubProvider, { GitHubProviderOptions } from './providers/githubProvider.js';
import RecordManager, { RecordManagerOptions } from './core/recordManager.js';

async function main() {
  const options: GitHubProviderOptions = {
    token: process.env.GITHUB_TOKEN as string,
    owner: process.env.GITHUB_OWNER as string,
    repo: process.env.GITHUB_REPO as string,
    committerName: process.env.GITHUB_NAME as string,
    committerEmail: process.env.GITHUB_EMAIL as string,
  };

  const githubProvider = new GitHubProvider(options);

  // Example: Create a folder
  await githubProvider.createFolder('myFolder');

  // Example: Create a file
  await githubProvider.createFile('myFolder/myFile.txt', 'File content', 'Create a new file');

  // Example: Get file content and sha
  const { content, sha } = await githubProvider.getFile('myFolder/myFile.txt');
  console.log('File content:', content);

  // Example: Delete the file
  await githubProvider.deleteFile('myFolder/myFile.txt', 'Delete the file');
}

main().catch(console.error);
