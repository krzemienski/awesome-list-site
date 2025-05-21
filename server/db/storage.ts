import { db } from './index';
import { IStorage, MemStorage } from '../storage';
import { 
  awesomeLists, 
  categories, 
  subcategories, 
  resources, 
  users,
  InsertAwesomeList,
  InsertCategory,
  InsertSubcategory,
  InsertResource,
  InsertUser,
  User
} from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { AwesomeList, Category, Subcategory, Resource } from '@/types/awesome-list';
import { createLogger } from 'vite';

const logger = createLogger();

export class DbStorage implements IStorage {
  private memStorage: MemStorage;

  constructor() {
    this.memStorage = new MemStorage();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const results = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return results[0];
    } catch (error) {
      logger.error(`Database error getting user: ${error}`);
      // Fall back to memory storage
      return this.memStorage.getUser(id);
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const results = await db.select().from(users).where(eq(users.username, username)).limit(1);
      return results[0];
    } catch (error) {
      logger.error(`Database error getting user by username: ${error}`);
      // Fall back to memory storage
      return this.memStorage.getUserByUsername(username);
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const results = await db.insert(users).values(user).returning();
      return results[0];
    } catch (error) {
      logger.error(`Database error creating user: ${error}`);
      // Fall back to memory storage
      return this.memStorage.createUser(user);
    }
  }

  // Awesome List methods
  async getAwesomeList(id: number): Promise<AwesomeList | null> {
    try {
      const results = await db.select().from(awesomeLists).where(eq(awesomeLists.id, id)).limit(1);
      return results[0] || null;
    } catch (error) {
      logger.error(`Database error getting awesome list: ${error}`);
      return null;
    }
  }

  async getLatestAwesomeList(): Promise<AwesomeList | null> {
    try {
      const results = await db
        .select()
        .from(awesomeLists)
        .orderBy(awesomeLists.id)
        .desc()
        .limit(1);
      return results[0] || null;
    } catch (error) {
      logger.error(`Database error getting latest awesome list: ${error}`);
      return null;
    }
  }

  async createAwesomeList(list: InsertAwesomeList): Promise<AwesomeList> {
    try {
      const results = await db.insert(awesomeLists).values(list).returning();
      return results[0];
    } catch (error) {
      logger.error(`Database error creating awesome list: ${error}`);
      throw new Error(`Failed to create awesome list: ${error}`);
    }
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    try {
      return await db.select().from(categories);
    } catch (error) {
      logger.error(`Database error getting categories: ${error}`);
      return [];
    }
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    try {
      const results = await db.insert(categories).values(category).returning();
      return results[0];
    } catch (error) {
      logger.error(`Database error creating category: ${error}`);
      throw new Error(`Failed to create category: ${error}`);
    }
  }

  // Subcategory methods
  async getSubcategories(categoryId: number): Promise<Subcategory[]> {
    try {
      return await db
        .select()
        .from(subcategories)
        .where(eq(subcategories.categoryId, categoryId));
    } catch (error) {
      logger.error(`Database error getting subcategories: ${error}`);
      return [];
    }
  }

  async createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory> {
    try {
      const results = await db.insert(subcategories).values(subcategory).returning();
      return results[0];
    } catch (error) {
      logger.error(`Database error creating subcategory: ${error}`);
      throw new Error(`Failed to create subcategory: ${error}`);
    }
  }

  // Resource methods
  async getResources(): Promise<Resource[]> {
    try {
      return await db.select().from(resources);
    } catch (error) {
      logger.error(`Database error getting resources: ${error}`);
      return [];
    }
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    try {
      const results = await db.insert(resources).values(resource).returning();
      return results[0];
    } catch (error) {
      logger.error(`Database error creating resource: ${error}`);
      throw new Error(`Failed to create resource: ${error}`);
    }
  }

  // Helper to store complete Awesome List data
  async storeAwesomeListData(
    listData: {
      title: string;
      description: string;
      repoUrl: string;
      sourceUrl: string;
    },
    categories: {
      name: string;
      slug: string;
      subcategories: {
        name: string;
        slug: string;
        resources: {
          title: string;
          url: string;
          description: string;
        }[];
      }[];
      resources: {
        title: string;
        url: string;
        description: string;
      }[];
    }[]
  ): Promise<void> {
    try {
      // First create the awesome list
      const list = await this.createAwesomeList({
        title: listData.title,
        description: listData.description,
        repoUrl: listData.repoUrl,
        sourceUrl: listData.sourceUrl
      });

      // Then create categories with their resources
      for (const categoryData of categories) {
        const category = await this.createCategory({
          name: categoryData.name,
          slug: categoryData.slug
        });

        // Create resources directly under the category
        for (const resourceData of categoryData.resources) {
          await this.createResource({
            title: resourceData.title,
            url: resourceData.url,
            description: resourceData.description,
            category: categoryData.name
          });
        }

        // Create subcategories and their resources
        for (const subcategoryData of categoryData.subcategories) {
          const subcategory = await this.createSubcategory({
            name: subcategoryData.name,
            slug: subcategoryData.slug,
            categoryId: category.id
          });

          // Create resources under the subcategory
          for (const resourceData of subcategoryData.resources) {
            await this.createResource({
              title: resourceData.title,
              url: resourceData.url,
              description: resourceData.description,
              category: categoryData.name,
              subcategory: subcategoryData.name
            });
          }
        }
      }

      logger.info('Successfully stored awesome list data in the database');
    } catch (error) {
      logger.error(`Error storing awesome list data: ${error}`);
      throw new Error(`Failed to store awesome list data: ${error}`);
    }
  }
}