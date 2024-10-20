export interface TableSchema {
  fields: { [key: string]: string }; // field name and type
  hashFields: string[]; // fields used for generating hash
  indexFields?: string[]; // fields to be indexed
}
