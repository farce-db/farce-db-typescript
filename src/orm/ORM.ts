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
      await this.provider.createFolder(tableName);
      console.log(`Table (folder) '${tableName}' created successfully.`);
    } catch (error) {
      console.error(`Error creating table '${tableName}':`, error);
    }
  }

  // Modify a "table" (rename or move folder)
  async modifyTable(oldTableName: string, newTableName: string): Promise<void> {
    try {
      await this.provider.renameFolder(oldTableName, newTableName);
      console.log(`Table '${oldTableName}' renamed to '${newTableName}' successfully.`);
    } catch (error) {
      console.error(`Error modifying table '${oldTableName}':`, error);
    }
  }

  // Delete a "table" (folder)
  async deleteTable(tableName: string): Promise<void> {
    try {
      await this.provider.deleteFolder(tableName);
      console.log(`Table (folder) '${tableName}' deleted successfully.`);
    } catch (error) {
      console.error(`Error deleting table '${tableName}':`, error);
    }
  }

    // Delete all contents of a table (folder) but keep the folder itself
    async deleteTableContents(tableName: string): Promise<void> {
        try {
        const folderContents = await this.provider.getFolderContents(tableName);
        
        for (const item of folderContents) {
            await this.provider.deleteFile(item.path, `Delete file '${item.name}' from table '${tableName}'`);
        }
    
        console.log(`All contents of table '${tableName}' deleted successfully.`);
    
        // Re-add .gitkeep to preserve the folder structure
        await this.provider.createFile(`${tableName}/.gitkeep`, '', `Re-add .gitkeep to table '${tableName}'`);
        console.log(`Re-added .gitkeep to preserve folder '${tableName}'.`);
    
        } catch (error) {
        console.error(`Error deleting contents of table '${tableName}':`, error);
        }
    }

  // Clear the entire repository by deleting all tables and files
  async clearRepo(): Promise<void> {
    try {
      // Get the contents of the repo and delete each item
      const contents = await this.provider.getRepoContents();
      for (const item of contents) {
        if (item.type === 'dir') {
          await this.deleteTable(item.path);  // If it's a folder (table), delete it
        } else {
          await this.provider.deleteFile(item.path, `Delete file '${item.name}'`);
        }
      }
      console.log(`Repository cleared successfully.`);
    } catch (error) {
      console.error(`Error clearing repository:`, error);
    }
  }
}

export default ORM;
