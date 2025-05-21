import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchAwesomeList } from "./parser";
import { createLogger } from "vite";

const logger = createLogger();
const AWESOME_RAW_URL = process.env.AWESOME_RAW_URL || "https://raw.githubusercontent.com/awesome-selfhosted/awesome-selfhosted/master/README.md";
let awesomeListData: any = null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize awesome list data
  try {
    logger.info(`Fetching awesome list from ${AWESOME_RAW_URL}`);
    awesomeListData = await fetchAwesomeList(AWESOME_RAW_URL);
    logger.info(`Successfully fetched awesome list with ${awesomeListData.resources.length} resources`);
  } catch (error) {
    logger.error(`Error fetching awesome list: ${error}`);
    awesomeListData = {
      title: "Awesome List",
      description: "A curated list of awesome resources",
      repoUrl: "https://github.com/sindresorhus/awesome",
      resources: []
    };
  }

  // API routes
  app.get("/api/awesome-list", (req, res) => {
    res.json(awesomeListData);
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
