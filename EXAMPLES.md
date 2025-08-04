# Usage Examples

Here are some example queries you can try with the Spoonacular MCP Server:

## Recipe Search Examples

### Basic Recipe Search
```json
{
  "tool": "search_recipes",
  "arguments": {
    "query": "chicken pasta",
    "number": 5
  }
}
```

### Diet-Specific Recipe Search
```json
{
  "tool": "search_recipes",
  "arguments": {
    "query": "healthy salad",
    "diet": "vegetarian",
    "number": 3
  }
}
```

### Recipe Search with Ingredients
```json
{
  "tool": "search_recipes",
  "arguments": {
    "query": "dinner",
    "includeIngredients": "chicken,rice,vegetables",
    "excludeIngredients": "nuts,dairy",
    "cuisine": "asian",
    "number": 5
  }
}
```

## Find Recipes by Available Ingredients
```json
{
  "tool": "find_recipes_by_ingredients",
  "arguments": {
    "ingredients": "chicken breast,tomatoes,garlic,onion",
    "number": 3,
    "ranking": 1
  }
}
```

## Get Recipe Details
```json
{
  "tool": "get_recipe_information",
  "arguments": {
    "id": 715538,
    "includeNutrition": true
  }
}
```

## Ingredient Search
```json
{
  "tool": "search_ingredients",
  "arguments": {
    "query": "tomato",
    "number": 5,
    "metaInformation": true
  }
}
```

## Nutrition Analysis
```json
{
  "tool": "analyze_nutrition",
  "arguments": {
    "ingredientList": "2 cups flour\n1 cup sugar\n3 eggs\n1/2 cup butter",
    "servings": 8
  }
}
```

## Random Recipe Discovery
```json
{
  "tool": "get_random_recipes",
  "arguments": {
    "number": 2,
    "tags": "vegetarian,healthy"
  }
}
```

## Pro Tips

1. **Use specific queries**: More specific recipe searches yield better results
2. **Combine filters**: Use diet, cuisine, and ingredient filters together for targeted results
3. **Explore recipe IDs**: Get detailed recipe information including nutrition facts
4. **Batch requests**: When possible, request multiple items in one call to stay within rate limits
5. **Handle rate limits**: The free tier allows 150 requests per day - plan accordingly
