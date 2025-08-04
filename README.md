# Spoonacular MCP Server

A Model Context Protocol (MCP) server that provides access to the [Spoonacular Food API](https://spoonacular.com/food-api/). This server enables AI assistants to search for recipes, get nutritional information, find ingredients, and more through the MCP protocol.

[![npm version](https://img.shields.io/npm/v/spoonacular-mcp.svg)](https://www.npmjs.com/package/spoonacular-mcp)
[![npm downloads](https://img.shields.io/npm/dm/spoonacular-mcp.svg)](https://www.npmjs.com/package/spoonacular-mcp)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## Features

- **Recipe Search**: Search for recipes by ingredients, diet, cuisine, and other criteria
- **Recipe Information**: Get detailed recipe information including ingredients, instructions, and nutrition
- **Ingredient Search**: Find and explore ingredient information
- **Nutrition Analysis**: Analyze nutrition for ingredient lists
- **Recipe by Ingredients**: Find recipes based on available ingredients
- **Random Recipes**: Get random recipe suggestions with optional filtering

## Quick Start

### Installation

```bash
npm install -g spoonacular-mcp
```

### Setup

1. **Get a Spoonacular API key** (free at https://spoonacular.com/food-api/console#Dashboard)

2. **Set your API key as an environment variable:**
   ```bash
   # Windows (PowerShell)
   $env:SPOONACULAR_API_KEY="your_api_key_here"
   
   # macOS/Linux
   export SPOONACULAR_API_KEY="your_api_key_here"
   ```

### Usage with MCP Clients

Add this configuration to your MCP client (Claude Desktop, etc.):

```json
{
  "servers": {
    "spoonacular": {
      "command": "spoonacular-mcp",
      "env": {
        "SPOONACULAR_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Test the Installation

```bash
# Set your API key
export SPOONACULAR_API_KEY="your_key_here"

# Test the server
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | spoonacular-mcp
```

## Available Tools

### `search_recipes`
Search for recipes with various filters.

**Parameters:**
- `query` (string): Search query for recipes
- `number` (number, 1-100): Number of results (default: 10)
- `diet` (string, optional): Diet type (vegetarian, vegan, gluten-free, etc.)
- `intolerances` (string, optional): Comma-separated intolerances
- `includeIngredients` (string, optional): Required ingredients (comma-separated)
- `excludeIngredients` (string, optional): Ingredients to exclude (comma-separated)
- `type` (string, optional): Meal type (main course, side dish, dessert, etc.)
- `cuisine` (string, optional): Cuisine type (italian, mexican, chinese, etc.)

### `get_recipe_information`
Get detailed information about a specific recipe.

**Parameters:**
- `id` (number): Recipe ID
- `includeNutrition` (boolean): Include nutrition information (default: false)

### `search_ingredients`
Search for ingredients by name.

**Parameters:**
- `query` (string): Ingredient search query
- `number` (number, 1-100): Number of results (default: 10)
- `metaInformation` (boolean): Include meta information (default: false)

### `analyze_nutrition`
Analyze nutrition for a list of ingredients.

**Parameters:**
- `ingredientList` (string): List of ingredients, one per line
- `servings` (number): Number of servings

### `find_recipes_by_ingredients`
Find recipes based on available ingredients.

**Parameters:**
- `ingredients` (string): Comma-separated list of available ingredients
- `number` (number, 1-100): Number of recipes (default: 5)
- `ranking` (number, 1-2): Ranking strategy (1=maximize used, 2=minimize missing)

### `get_random_recipes`
Get random recipes with optional filtering.

**Parameters:**
- `number` (number, 1-100): Number of random recipes (default: 1)
- `tags` (string, optional): Comma-separated tags for filtering

## Development

To run in development mode:

```bash
npm run dev
```

To build:

```bash
npm run build
```

## API Rate Limits

The free Spoonacular API plan includes:
- 150 requests per day
- Rate limiting applies

Consider upgrading to a paid plan for production use.

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
