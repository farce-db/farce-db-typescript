class Cache {
  private cache: Map<string, any> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  get(key: string): any | null {
    if (this.cache.has(key)) {
      const value = this.cache.get(key);

      this.cache.delete(key);
      this.cache.set(key, value); 
      return value;
    }
    return null;
  }

  set(key: string, value: any): void {
    if (this.cache.size >= this.maxSize) {

      const firstKey = this.cache.keys().next().value;
      
      if (firstKey !== undefined) {  
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }
}

export default Cache;
