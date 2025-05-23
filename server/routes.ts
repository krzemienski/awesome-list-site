import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchAwesomeList } from "./parser";
import { processAwesomeListData } from "../client/src/lib/parser";

const AWESOME_RAW_URL = process.env.AWESOME_RAW_URL || "https://raw.githubusercontent.com/awesome-selfhosted/awesome-selfhosted/master/README.md";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize awesome list data
  try {
    console.log(`Fetching awesome list from ${AWESOME_RAW_URL}`);
    const awesomeListData = await fetchAwesomeList(AWESOME_RAW_URL);
    storage.setAwesomeListData(awesomeListData);
    console.log(`Successfully fetched awesome list with ${awesomeListData.resources.length} resources`);
  } catch (error) {
    console.error(`Error fetching awesome list: ${error}`);
  }

  // API routes
  app.get("/api/awesome-list", (req, res) => {
    try {
      const data = storage.getAwesomeListData();
      
      if (!data) {
        return res.status(500).json({ error: 'No awesome list data available' });
      }
      
      // Process the data to match the expected frontend format
      const processedData = processAwesomeListData(data);
      res.json(processedData);
    } catch (error) {
      console.error('Error processing awesome list:', error);
      res.status(500).json({ error: 'Failed to process awesome list' });
    }
  });

  // New endpoint to switch lists
  app.post("/api/switch-list", async (req, res) => {
    try {
      const { rawUrl } = req.body;
      
      if (!rawUrl) {
        return res.status(400).json({ error: 'Raw URL is required' });
      }
      
      console.log(`Switching to list: ${rawUrl}`);
      const data = await fetchAwesomeList(rawUrl);
      storage.setAwesomeListData(data);
      
      const processedData = processAwesomeListData(data);
      console.log(`Successfully switched to list with ${data.resources.length} resources`);
      res.json(processedData);
    } catch (error) {
      console.error('Error switching list:', error);
      res.status(500).json({ error: 'Failed to switch list' });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
