export interface TableSchema {
    fields: {
      [key: string]: 'string' | 'number' | 'boolean';
    };
    hashFields: string[]; // Array of field names to use for generating the hash
  }
  