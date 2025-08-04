#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Spoonacular API configuration
const SPOONACULAR_API_BASE = "https://api.spoonacular.com";
const API_KEY = process.env.SPOONACULAR_API_KEY;

if (!API_KEY) {
  console.error("Error: SPOONACULAR_API_KEY environment variable is required");
  process.exit(1);
}

// Validation schemas
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

const RecipeInformationSchema = z.object({
  id: z.number().describe("The recipe ID"),
  includeNutrition: z.boolean().default(false).describe("Include nutrition information"),
});

const IngredientSearchSchema = z.object({
  query: z.string().describe("The ingredient search query"),
  number: z.number().min(1).max(100).default(10).describe("Number of results to return"),
  metaInformation: z.boolean().default(false).describe("Include meta information"),
});

const NutritionAnalysisSchema = z.object({
  ingredientList: z.string().describe("List of ingredients, one per line"),
  servings: z.number().min(1).describe("Number of servings"),
});

const RecipesByIngredientsSchema = z.object({
  ingredients: z.string().describe("Comma-separated list of ingredients you have"),
  number: z.number().min(1).max(100).default(5).describe("Number of recipes to find"),
  ranking: z.number().min(1).max(2).default(1).describe("Ranking strategy: 1=maximize used ingredients, 2=minimize missing ingredients"),
});

const RandomRecipesSchema = z.object({
  number: z.number().min(1).max(100).default(1).describe("Number of random recipes to fetch"),
  tags: z.string().optional().describe("Comma-separated list of tags (diet, meal type, etc.)"),
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

// List available tools
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
      {
        name: "get_recipe_information",
        description: "Get detailed information about a specific recipe by ID",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "number", description: "The recipe ID" },
            includeNutrition: { type: "boolean", default: false, description: "Include nutrition information" }
          },
          required: ["id"]
        },
      },
      {
        name: "search_ingredients",
        description: "Search for ingredients by name",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "The ingredient search query" },
            number: { type: "number", minimum: 1, maximum: 100, default: 10, description: "Number of results to return" },
            metaInformation: { type: "boolean", default: false, description: "Include meta information" }
          },
          required: ["query"]
        },
      },
      {
        name: "analyze_nutrition",
        description: "Analyze nutrition information for a list of ingredients",
        inputSchema: {
          type: "object",
          properties: {
            ingredientList: { type: "string", description: "List of ingredients, one per line" },
            servings: { type: "number", minimum: 1, description: "Number of servings" }
          },
          required: ["ingredientList", "servings"]
        },
      },
      {
        name: "find_recipes_by_ingredients",
        description: "Find recipes that can be made with the ingredients you have",
        inputSchema: {
          type: "object",
          properties: {
            ingredients: { type: "string", description: "Comma-separated list of ingredients you have" },
            number: { type: "number", minimum: 1, maximum: 100, default: 5, description: "Number of recipes to find" },
            ranking: { type: "number", minimum: 1, maximum: 2, default: 1, description: "Ranking strategy: 1=maximize used ingredients, 2=minimize missing ingredients" }
          },
          required: ["ingredients"]
        },
      },
      {
        name: "get_random_recipes",
        description: "Get random recipes, optionally filtered by tags",
        inputSchema: {
          type: "object",
          properties: {
            number: { type: "number", minimum: 1, maximum: 100, default: 1, description: "Number of random recipes to fetch" },
            tags: { type: "string", description: "Comma-separated list of tags (diet, meal type, etc.)" }
          },
          required: []
        },
      },
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

      case "get_recipe_information": {
        const params = RecipeInformationSchema.parse(args);
        const endpoint = `/recipes/${params.id}/information?includeNutrition=${params.includeNutrition}`;
        
        const data = await makeSpoonacularRequest(endpoint);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "search_ingredients": {
        const params = IngredientSearchSchema.parse(args);
        const queryParams = new URLSearchParams();
        
        queryParams.set('query', params.query);
        queryParams.set('number', params.number.toString());
        queryParams.set('metaInformation', params.metaInformation.toString());
        
        const data = await makeSpoonacularRequest(`/food/ingredients/search?${queryParams.toString()}`);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "analyze_nutrition": {
        const params = NutritionAnalysisSchema.parse(args);
        
        const response = await fetch(`${SPOONACULAR_API_BASE}/recipes/parseIngredients?apiKey=${API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            ingredientList: params.ingredientList,
            servings: params.servings.toString(),
          }),
        });
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "find_recipes_by_ingredients": {
        const params = RecipesByIngredientsSchema.parse(args);
        const queryParams = new URLSearchParams();
        
        queryParams.set('ingredients', params.ingredients);
        queryParams.set('number', params.number.toString());
        queryParams.set('ranking', params.ranking.toString());
        
        const data = await makeSpoonacularRequest(`/recipes/findByIngredients?${queryParams.toString()}`);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case "get_random_recipes": {
        const params = RandomRecipesSchema.parse(args);
        const queryParams = new URLSearchParams();
        
        queryParams.set('number', params.number.toString());
        if (params.tags) queryParams.set('tags', params.tags);
        
        const data = await makeSpoonacularRequest(`/recipes/random?${queryParams.toString()}`);
        
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

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Spoonacular MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
