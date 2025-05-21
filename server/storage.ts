import { users, type User, type InsertUser, type Resource, type Category, type Subcategory, type AwesomeList } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Awesome List data methods
  getAwesomeList?(id: number): Promise<AwesomeList | null>;
  getLatestAwesomeList?(): Promise<AwesomeList | null>;
  createAwesomeList?(list: any): Promise<AwesomeList>;
  getCategories?(): Promise<Category[]>;
  createCategory?(category: any): Promise<Category>;
  getSubcategories?(categoryId: number): Promise<Subcategory[]>;
  createSubcategory?(subcategory: any): Promise<Subcategory>;
  getResources?(): Promise<Resource[]>;
  createResource?(resource: any): Promise<Resource>;
  storeAwesomeListData?(listData: any, categories: any[]): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

// Import the database storage implementation
import { DbStorage } from './db/storage';

// Create and export the storage instance
// Use the database storage if DATABASE_URL is available, otherwise use memory storage
export const storage = process.env.DATABASE_URL 
  ? new DbStorage() 
  : new MemStorage();
