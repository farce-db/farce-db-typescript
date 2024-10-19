// src/orm/ORM.ts
import GitHubProvider from '../providers/githubProvider.js';

export interface ORMOptions {
  provider: GitHubProvider;
}

class ORM {
  private provider: GitHubProvider;

  constructor(options: ORMOptions) {
    this.provider = options.provider;
  }

  // Create a "table" (folder)
  async createTable(tableName: string): Promise<void> {
    try {
      const folderCreated = await this.provider.createFolder(tableName);
      console.log(`Table (folder) '${tableName}' created successfully.`);
    } catch (error) {
      console.error(`Error creating table '${tableName}':`, error);
    }
  }

  // Modify a "table" (rename or move folder)
  async modifyTable(oldTableName: string, newTableName: string): Promise<void> {
    try {
      // Rename table (folder)
      const folderModified = await this.provider.renameFolder(oldTableName, newTableName);
      console.log(`Table '${oldTableName}' renamed to '${newTableName}' successfully.`);
    } catch (error) {
      console.error(`Error modifying table '${oldTableName}':`, error);
    }
  }

  // Delete a "table" (folder)
  async deleteTable(tableName: string): Promise<void> {
    try {
      const folderDeleted = await this.provider.deleteFolder(tableName);
      console.log(`Table (folder) '${tableName}' deleted successfully.`);
    } catch (error) {
      console.error(`Error deleting table '${tableName}':`, error);
    }
  }
}

export default ORM;
