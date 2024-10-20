import ORM from './orm/ORM.js';
import GitHubProvider from './providers/githubProvider.js';
import { TableSchema } from './types/Schema.js';

async function main() {
  const gitHubProvider = new GitHubProvider({
    token: process.env.GITHUB_TOKEN as string,
    owner: process.env.GITHUB_OWNER as string,
    repo: process.env.GITHUB_REPO as string,
    committerName: process.env.GITHUB_NAME as string,
    committerEmail: process.env.GITHUB_EMAIL as string,
  });

  const orm = new ORM({ provider: gitHubProvider });

  const usersSchema: TableSchema = {
    fields: {
      name: 'string',
      age: 'number',
      email: 'string',
    },
    hashFields: ['name', 'email'], // Specify which fields to use for hashing
  };

  orm.registerTableSchema('users', usersSchema);

  // Time utility function
  async function measureTime(label: string, fn: () => Promise<void>) {
    console.time(label);
    await fn();
    console.timeEnd(label);
  }

  try {
    // 1. Create Table
    await measureTime('Create Table', async () => {
      await orm.createTable('users');
    });

    // 2. Insert Records with hash-based filenames (No 'id' needed)
    const record1 = { name: 'Alice Smith', age: 25, email: 'alice@example.com' };
    const record2 = { name: 'Bob Johnson', age: 30, email: 'bob@example.com' };
    const record3 = { name: 'Charlie Lee', age: 28, email: 'charlie@example.com' };
    
    await measureTime('Insert Record 1', async () => {
      await orm.insertRecord('users', record1);
    });
    await measureTime('Insert Record 2', async () => {
      await orm.insertRecord('users', record2);
    });
    await measureTime('Insert Record 3', async () => {
      await orm.insertRecord('users', record3);
    });

    // 3. Retrieve a record by its hash
    const hash = orm['generateHashFromFields']('users', record1); // Get the hash based on fields
    await measureTime('Get Record by Hash', async () => {
      const retrievedRecord = await orm.getRecordByHash('users', hash);
      console.log('Retrieved Record:', retrievedRecord);
    });

    // 4. Update a record by its hash
    const updates = { age: 26 };
    await measureTime('Update Record by Hash', async () => {
      await orm.updateRecordByHash('users', hash, updates);
    });

    // 5. Get Updated Record
    await measureTime('Get Updated Record', async () => {
      const updatedRecord = await orm.getRecordByHash('users', hash);
      console.log('Updated Record:', updatedRecord);
    });

    // 6. Delete Record by Hash
    await measureTime('Delete Record by Hash', async () => {
      await orm.deleteRecordByHash('users', hash);
    });

    // // 7. Clear Repository (this will delete everything in the repo)
    // await measureTime('Clear Repository', async () => {
    //   await orm.clearRepo();
    // });

  } catch (error) {
    console.error('Error during testing:', error);
  }
}

main().catch(console.error);
