#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import express from 'express';
import cors from 'cors';

// Spoonacular API configuration
const SPOONACULAR_API_BASE = "https://api.spoonacular.com";
const API_KEY = process.env.SPOONACULAR_API_KEY;

if (!API_KEY) {
  console.error("Error: SPOONACULAR_API_KEY environment variable is required");
  process.exit(1);
}

// Your existing validation schemas (keeping them for tool calls)
const RecipeSearchSchema = z.object({
  query: z.string().describe("The search query for recipes"),
  number: z.number().min(1).max(100).default(10).describe("Number of results to return (1-100)"),
  diet: z.string().optional().describe("Diet type (vegetarian, vegan, gluten-free, etc.)"),
  intolerances: z.string().optional().describe("Comma-separated list of intolerances"),
  includeIngredients: z.string().optional().describe("Comma-separated list of ingredients that must be included"),
  excludeIngredients: z.string().optional().describe("Comma-separated list of ingredients to exclude"),
  type: z.string().optional().describe("Meal type (main course, side dish, dessert, etc.)"),
  cuisine: z.string().optional().describe("Cuisine type (italian, mexican, chinese, etc.)"),
});

// Helper function to make API requests
async function makeSpoonacularRequest(endpoint: string): Promise<any> {
  const url = `${SPOONACULAR_API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}apiKey=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch from Spoonacular API: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Create server instance
function createMCPServer() {
  const server = new Server(
    {
      name: "spoonacular-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools (using JSON Schema format)
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "search_recipes",
          description: "Search for recipes based on ingredients, diet, cuisine, and other criteria",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "The search query for recipes" },
              number: { type: "number", minimum: 1, maximum: 100, default: 10, description: "Number of results to return (1-100)" },
              diet: { type: "string", description: "Diet type (vegetarian, vegan, gluten-free, etc.)" },
              intolerances: { type: "string", description: "Comma-separated list of intolerances" },
              includeIngredients: { type: "string", description: "Comma-separated list of ingredients that must be included" },
              excludeIngredients: { type: "string", description: "Comma-separated list of ingredients to exclude" },
              type: { type: "string", description: "Meal type (main course, side dish, dessert, etc.)" },
              cuisine: { type: "string", description: "Cuisine type (italian, mexican, chinese, etc.)" }
            },
            required: ["query"]
          },
        },
        // Add other tools here...
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "search_recipes": {
          const params = RecipeSearchSchema.parse(args);
          const queryParams = new URLSearchParams();
          
          queryParams.set('query', params.query);
          queryParams.set('number', params.number.toString());
          
          if (params.diet) queryParams.set('diet', params.diet);
          if (params.intolerances) queryParams.set('intolerances', params.intolerances);
          if (params.includeIngredients) queryParams.set('includeIngredients', params.includeIngredients);
          if (params.excludeIngredients) queryParams.set('excludeIngredients', params.excludeIngredients);
          if (params.type) queryParams.set('type', params.type);
          if (params.cuisine) queryParams.set('cuisine', params.cuisine);
          
          const data = await makeSpoonacularRequest(`/recipes/complexSearch?${queryParams.toString()}`);
          
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

// Main function with transport selection
async function main() {
  const mode = process.argv[2] || 'stdio';
  const server = createMCPServer();
  
  if (mode === 'http') {
    // HTTP mode with Express
    const app = express();
    const port = parseInt(process.argv[3]) || 3000;
    
    app.use(cors());
    app.use(express.json());
    
    // Simple HTTP endpoint for testing
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', server: 'spoonacular-mcp' });
    });
    
    app.listen(port, () => {
      console.log(`🌐 Spoonacular MCP Server running on HTTP port ${port}`);
      console.log(`   Health check: http://localhost:${port}/health`);
    });
    
  } else {
    // STDIO mode (default)
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Spoonacular MCP Server running on stdio");
  }
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
