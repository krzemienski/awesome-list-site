import { users, type User, type InsertUser, type Resource, type Category, type Subcategory, type AwesomeList } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Awesome List data methods (in-memory only)
  setAwesomeListData(data: any): void;
  getAwesomeListData(): any | null;
  getCategories(): any[];
  getResources(): any[];
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

  private awesomeListData: any = null;

  setAwesomeListData(data: any): void {
    this.awesomeListData = data;
  }

  getAwesomeListData(): any | null {
    return this.awesomeListData;
  }

  getCategories(): any[] {
    if (!this.awesomeListData) return [];
    
    const categories = new Map();
    this.awesomeListData.resources.forEach((resource: any) => {
      if (resource.category) {
        if (!categories.has(resource.category)) {
          categories.set(resource.category, {
            name: resource.category,
            slug: resource.category.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            resources: [],
            subcategories: new Map()
          });
        }
        
        const category = categories.get(resource.category);
        category.resources.push(resource);
        
        if (resource.subcategory) {
          if (!category.subcategories.has(resource.subcategory)) {
            category.subcategories.set(resource.subcategory, {
              name: resource.subcategory,
              slug: resource.subcategory.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              resources: []
            });
          }
          category.subcategories.get(resource.subcategory).resources.push(resource);
        }
      }
    });
    
    return Array.from(categories.values()).map(cat => ({
      ...cat,
      subcategories: Array.from(cat.subcategories.values())
    }));
  }

  getResources(): any[] {
    return this.awesomeListData?.resources || [];
  }
}

// Always use memory storage for awesome list generator
// This is faster and simpler for self-hosted awesome lists
export const storage = new MemStorage();
