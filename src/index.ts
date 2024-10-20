// src/index.ts
import GitHubProvider, { GitHubProviderOptions } from './providers/githubProvider.js';
import ORM from './orm/ORM.js';

async function main() {
  // Define GitHubProvider options
  const options: GitHubProviderOptions = {
    token: process.env.GITHUB_TOKEN as string,
    owner: process.env.GITHUB_OWNER as string,
    repo: process.env.GITHUB_REPO as string,
    committerName: process.env.GITHUB_NAME as string,
    committerEmail: process.env.GITHUB_EMAIL as string,
  };

  // Initialize GitHubProvider and ORM
  const githubProvider = new GitHubProvider(options);
  const orm = new ORM({ provider: githubProvider });

  // Test createTable function
  console.log("Testing createTable:");
  await orm.createTable('testTable'); // Creates the table (folder) 'testTable'

  // Test modifyTable function (rename the table)
  console.log("Testing modifyTable:");
  await orm.modifyTable('testTable', 'renamedTestTable'); // Renames 'testTable' to 'renamedTestTable'

  // Test deleteTable function
  console.log("Testing deleteTable:");
  await orm.deleteTable('renamedTestTable'); // Deletes the renamed table 'renamedTestTable'

  // Test deleteTableContents function (recreate and clear contents)
  console.log("Testing deleteTableContents:");
  await orm.createTable('testTableForContent');
  await githubProvider.createFile('testTableForContent/file1.txt', 'File 1 content', 'Add file1');
  await githubProvider.createFile('testTableForContent/file2.txt', 'File 2 content', 'Add file2');
  console.log("Table contents before deletion:");
  console.log(await githubProvider.getFolderContents('testTableForContent'));
  await orm.deleteTableContents('testTableForContent'); // Deletes the contents of 'testTableForContent'
  console.log("Table contents after deletion:");
  console.log(await githubProvider.getFolderContents('testTableForContent'));

  // Test clearRepo function (Note: Be careful, this will clear the entire repo)
  console.log("Testing clearRepo:");
  console.log("Repo contents before clearing:");
  console.log(await githubProvider.getRepoContents());
  await orm.clearRepo(); // Clears the entire repository
  console.log("Repo contents after clearing:");
  console.log(await githubProvider.getRepoContents());
}

main().catch(console.error);
