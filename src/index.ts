import ORM from "./orm/ORM.js";
import GitHubProvider from "./providers/githubProvider.js";
import { TableSchema } from "./types/Schema.js";


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
      name: "string",
      age: "number",
      email: "string",
    },
    hashFields: ["name", "email"], // Fields used to generate hash
    indexFields: ["name", "email"], // Fields to be indexed
  };

  // Register the users table schema
  orm.registerTableSchema("users", usersSchema);

  try {

    // Create the table (folder in GitHub repo)
    await orm.createTable("users");

    // Insert records into the users table
    const record1 = { name: "Alice Smith", age: 25, email: "alice@example.com" };
    const record2 = { name: "Bob Johnson", age: 30, email: "bob@example.com" };

    await orm.insertRecord("users", record1);
    await orm.insertRecord("users", record2);

    // Retrieve a record by the indexed field 'name'
    const alice = await orm.getRecordByField("users", "name", "Alice Smith");
    console.log("Retrieved Alice:", alice);

    // await orm.clearRepo();
  } catch (error) {
    console.error("Error during ORM operations:", error);
  }
}

main().catch(console.error);
