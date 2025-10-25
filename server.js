const express = require('express');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

let mcpProcess = null;

// Initialize MCP server process
function initMCPServer() {
  if (mcpProcess) {
    mcpProcess.kill();
  }
  
  mcpProcess = spawn('npx', ['spoonacular-mcp'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env
  });
  
  mcpProcess.stderr.on('data', (data) => {
    console.error(`MCP stderr: ${data}`);
  });
  
  mcpProcess.on('exit', (code) => {
    console.log(`MCP process exited with code ${code}`);
  });
  
  return mcpProcess;
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'spoonacular-mcp-server',
    message: 'MCP Server running'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// MCP JSON-RPC endpoint
app.post('/mcp', async (req, res) => {
  try {
    if (!mcpProcess || mcpProcess.killed) {
      initMCPServer();
    }
    
    const request = JSON.stringify(req.body) + '\n';
    
    // Set up response handler
    let responseData = '';
    const responseHandler = (data) => {
      responseData += data.toString();
      try {
        const response = JSON.parse(responseData);
        mcpProcess.stdout.removeListener('data', responseHandler);
        res.json(response);
      } catch (e) {
        // Not complete JSON yet, wait for more data
      }
    };
    
    mcpProcess.stdout.on('data', responseHandler);
    
    // Send request to MCP server
    mcpProcess.stdin.write(request);
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!res.headersSent) {
        mcpProcess.stdout.removeListener('data', responseHandler);
        res.status(504).json({ error: 'Request timeout' });
      }
    }, 30000);
    
  } catch (error) {
    console.error('Error processing MCP request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize MCP server on startup
initMCPServer();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HTTP wrapper listening on port ${PORT}`);
  console.log('MCP Server initialized and ready');
});
