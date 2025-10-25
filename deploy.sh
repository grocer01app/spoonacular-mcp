#!/bin/bash
# --- 1. Load Environment Variables ---
source .env
if [ -z "$GCP_PROJECT_ID" ] || [ -z "$REGION" ] || [ -z "$SERVICE_NAME" ] || [ -z "$SPOONACULAR_API_KEY" ]; then
    echo "ERROR: One or more required environment variables are missing in .env."
    echo "Required: GCP_PROJECT_ID, REGION, SERVICE_NAME, SPOONACULAR_API_KEY"
    exit 1
fi

# Set GCP project
echo "🛠️ Setting Google Cloud project to $GCP_PROJECT_ID..."
gcloud config set project "$GCP_PROJECT_ID"

# --- 2. Build Artifact Registry Repo (if needed) ---
REPO_NAME="mcp-repo"
ARTIFACT_REGISTRY_URL="$REGION-docker.pkg.dev/$GCP_PROJECT_ID/$REPO_NAME"

if ! gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" &> /dev/null; then
    echo "📦 Creating Artifact Registry repository: $REPO_NAME in $REGION..."
    gcloud artifacts repositories create "$REPO_NAME" \
        --repository-format=docker \
        --location="$REGION" \
        --description="Docker repository for MCP containers"
fi

# --- 3. Create MCP-to-HTTP wrapper ---
echo "📝 Creating MCP-to-HTTP wrapper..."
cat <<'EOF' > server.js
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
EOF

cat <<'EOF' > package.json
{
  "name": "spoonacular-mcp-wrapper",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.2",
    "spoonacular-mcp": "^1.0.0"
  }
}
EOF

# --- 4. Create Dockerfile ---
echo "📝 Creating Dockerfile..."
cat <<'EOF' > Dockerfile
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json ./
COPY server.js ./

# Install dependencies
RUN npm install

# Expose port
EXPOSE 8080

# Start the HTTP wrapper
CMD ["node", "server.js"]
EOF

# --- 5. Build and Push Container ---
IMAGE_TAG="$ARTIFACT_REGISTRY_URL/$SERVICE_NAME"
echo "🏗️ Building and pushing container image to $IMAGE_TAG..."
gcloud builds submit . \
    --tag "$IMAGE_TAG" \
    --project "$GCP_PROJECT_ID"

# --- 6. Deploy to Cloud Run ---
echo "🚀 Deploying MCP Server ($SERVICE_NAME) to Cloud Run in $REGION..."
gcloud run deploy "$SERVICE_NAME" \
    --image "$IMAGE_TAG" \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars="SPOONACULAR_API_KEY=$SPOONACULAR_API_KEY" \
    --cpu-boost \
    --max-instances 3 \
    --memory 512Mi \
    --port 8080 \
    --timeout 300

# --- 7. Get Service URL and Output Details ---
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)')
echo "✅ Deployment complete."
echo ""
echo "--- Connection Details ---"
echo "MCP Server URL:  $SERVICE_URL"
echo "Server Name:     $SERVICE_NAME"
echo "Region:          $REGION"
echo ""
echo "💡 Usage:"
echo "Health check:    curl $SERVICE_URL/health"
echo "MCP endpoint:    POST to $SERVICE_URL/mcp"
echo ""
echo "Example MCP request:"
echo 'curl -X POST '"$SERVICE_URL"'/mcp \\'
echo '  -H "Content-Type: application/json" \\'
echo '  -d '"'"'{"jsonrpc":"2.0","method":"tools/list","id":1}'"'"
