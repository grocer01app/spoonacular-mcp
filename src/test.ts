#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🍽️  Testing Spoonacular MCP Server...\n');

if (!process.env.SPOONACULAR_API_KEY) {
  console.error('❌ Error: SPOONACULAR_API_KEY environment variable is required');
  console.log('   Please set your API key:');
  console.log('   export SPOONACULAR_API_KEY=your_key_here');
  console.log('   or create a .env file with your key\n');
  process.exit(1);
}

const serverPath = join(__dirname, '..', 'dist', 'index.js');

console.log('Starting MCP server...');
console.log('Server path:', serverPath);
console.log('API Key:', process.env.SPOONACULAR_API_KEY ? '✅ Set' : '❌ Not set');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: process.env
});

// Send a list tools request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

setTimeout(() => {
  console.log('\n📋 Sending list tools request...');
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 1000);

server.stdout.on('data', (data) => {
  const response = data.toString().trim();
  if (response) {
    try {
      const parsed = JSON.parse(response);
      if (parsed.result && parsed.result.tools) {
        console.log('\n✅ Server is working! Available tools:');
        parsed.result.tools.forEach((tool: any, index: number) => {
          console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
        });
        console.log('\n🎉 Setup successful! You can now use this server with MCP clients.');
        server.kill();
      }
    } catch (e) {
      console.log('Response:', response);
    }
  }
});

server.on('error', (error) => {
  console.error('❌ Error running server:', error.message);
});

server.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
  }
  process.exit(code || 0);
});

// Cleanup
process.on('SIGINT', () => {
  server.kill();
});
