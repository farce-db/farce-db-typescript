// src/index.ts
import GitHubProvider, { GitHubProviderOptions } from './providers/githubProvider.js';
import ORM from './orm/ORM.js';

async function main() {
  const options: GitHubProviderOptions = {
    token: process.env.GITHUB_TOKEN as string,
    owner: process.env.GITHUB_OWNER as string,
    repo: process.env.GITHUB_REPO as string,
    committerName: process.env.GITHUB_NAME as string,
    committerEmail: process.env.GITHUB_EMAIL as string,
  };

  const githubProvider = new GitHubProvider(options);

  // Create an instance of the ORM
  const orm = new ORM({ provider: githubProvider });

  // Test creating a table (folder)
  console.log('Testing createTable:');
  await orm.createTable('testTable');

  // Test renaming (modifying) the table
  console.log('Testing modifyTable:');
  await orm.modifyTable('testTable', 'renamedTestTable');

  // Test deleting the table (folder)
  console.log('Testing deleteTable:');
  await orm.deleteTable('renamedTestTable');
}

main().catch(console.error);
