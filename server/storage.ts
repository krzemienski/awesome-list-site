import { users, type User, type UpsertUser, type Resource, type Category, type Subcategory, type AwesomeList } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods (Replit Auth required)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  
  // Awesome List data methods (in-memory only)
  setAwesomeListData(data: any): void;
  getAwesomeListData(): any | null;
  getCategories(): any[];
  getResources(): any[];
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Legacy method - not used with OAuth
    return undefined;
  }

  async createUser(insertUser: UpsertUser): Promise<User> {
    // Legacy method - use upsertUser instead for OAuth
    const user: User = {
      id: insertUser.id || String(this.currentId++),
      email: insertUser.email || null,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      profileImageUrl: insertUser.profileImageUrl || null,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async upsertUser(insertUser: UpsertUser): Promise<User> {
    const user: User = {
      id: insertUser.id || String(this.currentId++),
      email: insertUser.email || null,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      profileImageUrl: insertUser.profileImageUrl || null,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
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
