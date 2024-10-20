// src/core/RecordManager.ts
import Cache from "./cache.js";

export interface StorageProvider {
  createFile(folderId: string, record: any, fileName: string): Promise<string>;
  getFile(fileId: string): Promise<any>;
}

export interface RecordManagerOptions {
  storageProvider: StorageProvider;
  folderId: string;
  cacheSize?: number;
}

class RecordManager {
  private storageProvider: StorageProvider;
  private cache: Cache;
  private folderId: string;

  constructor(options: RecordManagerOptions) {
    this.storageProvider = options.storageProvider;
    this.cache = new Cache(options.cacheSize || 50);
    this.folderId = options.folderId;
  }

  async createRecord(record: any): Promise<string> {
    const cachedRecord = this.cache.get(record.id);
    if (cachedRecord) {
      console.log('Record found in cache, skipping creation.');
      return cachedRecord;
    }

    const fileId = await this.storageProvider.createFile(this.folderId, record, record.id);
    this.cache.set(record.id, fileId);
    return fileId;
  }

  async getRecord(fileId: string): Promise<any> {
    const cachedRecord = this.cache.get(fileId);
    if (cachedRecord) {
      return cachedRecord;
    }

    const file = await this.storageProvider.getFile(fileId);
    this.cache.set(fileId, file);
    return file;
  }
}

export default RecordManager;