// src/orm/ORM.ts
import GitHubProvider from "../providers/githubProvider.js";
import { TableSchema } from "../types/Schema.js";
import { v4 as uuidv4 } from "uuid"; // Import the UUID library
import crypto from "crypto"; // For generating hashes

export interface ORMOptions {
  provider: GitHubProvider;
}

class ORM {
  private provider: GitHubProvider;
  private schemas: { [tableName: string]: TableSchema };

  constructor(options: ORMOptions) {
    this.provider = options.provider;
    this.schemas = {};
  }

  // Generate a UUID
  private generateUUID(): string {
    return uuidv4();
  }

  // Register a table schema
  registerTableSchema(tableName: string, schema: TableSchema): void {
    this.schemas[tableName] = schema;

    // Create index files for the indexed fields
    if (schema.indexFields) {
      schema.indexFields.forEach(async (field) => {
        const indexFilePath = `${tableName}/index_${field}.json`;
        try {
          await this.provider.createOrUpdateFile(
            indexFilePath,
            "{}",
            `Create index for field '${field}'`
          );
          console.log(
            `Index created for field '${field}' in table '${tableName}'.`
          );
        } catch (error) {
          console.error(`Error creating index for field '${field}':`, error);
        }
      });
    }
    console.log(`Schema for table '${tableName}' registered successfully.`);
  }

  // Simple hash function based on selected fields
  private generateHashFromFields(tableName: string, record: any): string {
    const schema = this.schemas[tableName];

    // Use fields specified in `hashFields` to generate the hash
    const hashInput = schema.hashFields
      .filter((field) => record[field]) // Only use fields that exist in the record
      .map((field) => record[field].toString())
      .join("-"); // Concatenate values into a string

    return crypto.createHash("md5").update(hashInput).digest("hex"); // Generate a hash
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
      console.log(
        `Table '${oldTableName}' renamed to '${newTableName}' successfully.`
      );
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

  // Validate a record against the table's schema
  private validateRecord(tableName: string, record: any): boolean {
    const schema = this.schemas[tableName];
    if (!schema) {
      throw new Error(`Schema for table '${tableName}' not found.`);
    }

    // Validate fields
    for (const [field, type] of Object.entries(schema.fields)) {
      if (typeof record[field] !== type) {
        throw new Error(
          `Field '${field}' is of incorrect type. Expected '${type}' but got '${typeof record[
            field
          ]}'.`
        );
      }
    }

    return true;
  }

  // Convert a record object to a delimiter-separated string
  private convertRecordToDelimitedString(
    tableName: string,
    record: any
  ): string {
    const schema = this.schemas[tableName];
    const values = Object.keys(schema.fields).map((field) => record[field]);
    return values.join("|");
  }

  // Convert a delimiter-separated string to a record object
  private convertDelimitedStringToRecord(
    tableName: string,
    content: string
  ): any {
    const schema = this.schemas[tableName];
    const values = content.split("|");
    const record: any = {};

    Object.keys(schema.fields).forEach((field, index) => {
      record[field] = values[index];
    });
    return record;
  }

  // Insert a record into a table, and update indexes
  async insertRecord(tableName: string, record: any): Promise<void> {
    try {
      this.validateRecord(tableName, record); // Validate the record

      const schema = this.schemas[tableName];
      const hash = this.generateHashFromFields(tableName, record);
      const filePath = `${tableName}/${hash}`; // Hash becomes the filename

      // Convert the record to a delimited string
      const recordString = this.convertRecordToDelimitedString(
        tableName,
        record
      );

      // Create or update the file
      await this.provider.createOrUpdateFile(
        filePath,
        recordString,
        `Insert record with hash '${hash}'`
      );
      console.log(
        `Record inserted into table '${tableName}' with hash '${hash}'.`
      );

      // Update indexes
      if (schema.indexFields) {
        await Promise.all(
          schema.indexFields.map(async (field) => {
            const indexFilePath = `${tableName}/index_${field}.json`;

            // Get the index file, or create it if it doesn't exist
            let indexContent: string;
            try {
              indexContent = (await this.provider.getFile(indexFilePath))
                .content;
            } catch (error: any) {
              if (error.status === 404) {
                console.log(
                  `Index file for '${field}' not found, creating a new one.`
                );
                indexContent = "{}"; // Empty index
              } else {
                throw error;
              }
            }

            const index = JSON.parse(indexContent);
            index[record[field]] = hash; // Map field value to hash

            await this.provider.createOrUpdateFile(
              indexFilePath,
              JSON.stringify(index),
              `Update index for field '${field}'`
            );
          })
        );
      }
    } catch (error) {
      console.error(`Error inserting record into table '${tableName}':`, error);
    }
  }

  // Get a record by its hash (filename)
  async getRecordByHash(tableName: string, hash: string): Promise<any> {
    try {
      const filePath = `${tableName}/${hash}`;
      const fileContent = await this.provider.getFile(filePath);
      console.log(
        `Record retrieved from table '${tableName}' with hash '${hash}'.`
      );
      return this.convertDelimitedStringToRecord(
        tableName,
        fileContent.content
      );
    } catch (error) {
      console.error(
        `Error fetching record from table '${tableName}' with hash '${hash}':`,
        error
      );
    }
  }

  // Get a record by an indexed field
  async getRecordByField(
    tableName: string,
    field: string,
    value: string
  ): Promise<any> {
    try {
      const schema = this.schemas[tableName];

      if (!schema.indexFields || !schema.indexFields.includes(field)) {
        throw new Error(
          `Field '${field}' is not indexed in table '${tableName}'.`
        );
      }

      const indexFilePath = `${tableName}/index_${field}.json`;
      const indexContent = await this.provider.getFile(indexFilePath);
      const index = JSON.parse(indexContent.content);

      const hash = index[value];
      if (!hash) {
        throw new Error(`No record found with ${field} = '${value}'`);
      }

      // Retrieve the record using the hash
      return this.getRecordByHash(tableName, hash);
    } catch (error) {
      console.error(
        `Error fetching record by field '${field}' in table '${tableName}':`,
        error
      );
    }
  }

  // Update an existing record, identified by hash (filename)
  async updateRecordByHash(
    tableName: string,
    hash: string,
    updates: Partial<any>
  ): Promise<void> {
    try {
      const existingRecord = await this.getRecordByHash(tableName, hash);
      if (!existingRecord) {
        throw new Error(`Record with hash '${hash}' not found.`);
      }

      const updatedRecord = { ...existingRecord, ...updates };

      // Validate the updated record
      this.validateRecord(tableName, updatedRecord);

      // Convert the updated record to delimited string
      const updatedRecordString = this.convertRecordToDelimitedString(
        tableName,
        updatedRecord
      );

      const filePath = `${tableName}/${hash}`;
      await this.provider.createOrUpdateFile(
        filePath,
        updatedRecordString,
        `Update record with hash '${hash}'`
      );
      console.log(`Record updated with hash '${hash}'.`);
    } catch (error) {
      console.error(`Error updating record with hash '${hash}':`, error);
    }
  }

  // Delete a record by hash (filename)
  async deleteRecordByHash(tableName: string, hash: string): Promise<void> {
    try {
      const filePath = `${tableName}/${hash}`;
      await this.provider.deleteFile(
        filePath,
        `Delete record with hash '${hash}'`
      );
      console.log(
        `Record deleted from table '${tableName}' with hash '${hash}'.`
      );
    } catch (error) {
      console.error(
        `Error deleting record from table '${tableName}' with hash '${hash}':`,
        error
      );
    }
  }

  // Clear the entire repository by deleting all tables and files
  async clearRepo(): Promise<void> {
    try {
      // Get the contents of the repo and delete each item
      const contents = await this.provider.getRepoContents();
      for (const item of contents) {
        if (item.type === "dir") {
          await this.deleteTable(item.path); // If it's a folder (table), delete it
        } else {
          await this.provider.deleteFile(
            item.path,
            `Delete file '${item.name}'`
          );
        }
      }
      console.log(`Repository cleared successfully.`);
    } catch (error) {
      console.error(`Error clearing repository:`, error);
    }
  }
}

export default ORM;
