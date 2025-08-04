#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Your existing schemas and server setup code here...
// (I'll just show the transport selection logic)

// Transport selection based on command line argument
async function main() {
  const transportType = process.argv[2] || 'stdio';
  
  let transport;
  
  if (transportType === 'sse') {
    const port = parseInt(process.argv[3]) || 3000;
    console.error(`Starting Spoonacular MCP Server on HTTP port ${port}`);
    transport = new SSEServerTransport('/message', port);
  } else {
    console.error("Spoonacular MCP Server running on stdio");
    transport = new StdioServerTransport();
  }
  
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
