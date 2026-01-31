# Web UI Guide

## Overview

Emissary includes a modern web interface for managing agents, workflows, and monitoring system health. The web UI provides:

- 🎨 **Modern Design**: Dark theme with smooth animations
- 🚀 **Agent Management**: Create and manage agents visually
- ⚡ **Live Execution**: Execute agents and see results in real-time
- 📊 **Memory Monitoring**: View memory statistics and manage storage
- 🔧 **Tool Browser**: Explore available tools
- 🌊 **Workflow Viewer**: View and execute workflows

## Quick Start

### 1. Set API Key

```bash
export ANTHROPIC_API_KEY="your-anthropic-key"
# or
export OPENAI_API_KEY="your-openai-key"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Server

```bash
npm run web
```

### 4. Access the UI

Open your browser to: **http://localhost:3000**

You should see:
```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Emissary Web Server                                 ║
║                                                           ║
║   Server:    http://localhost:3000                       ║
║   API:       http://localhost:3000/api                   ║
║   Status:    http://localhost:3000/api/health            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

## Features

### Agents Tab

**View Agents**
- See all created agents
- View agent capabilities
- Check agent IDs

**Create Agent**
1. Click "Create Agent" button
2. Enter name and description
3. Select capabilities (optional)
4. Click "Create"

Example:
- Name: `Research Assistant`
- Description: `Helps with research tasks`
- Capabilities: `web-search`, `data-analysis`

### Execute Tab

**Run an Agent**
1. Select an agent from the dropdown
2. Enter task description
3. Set max iterations (default: 5)
4. Specify tools (optional, comma-separated)
5. Click "Execute Agent"

Example:
- Agent: `Math Assistant`
- Task: `Calculate 42 + 58 using the calculator tool`
- Max Iterations: `5`
- Tools: `calculator`

**View Results**
- Success status
- Final output
- Execution duration
- Iteration details

### Workflows Tab

**View Workflows**
- See all created workflows
- Check workflow steps
- View workflow status

**Note**: Workflow creation via UI is coming soon. Use the API or code for now.

### Tools Tab

**Browse Tools**
- View all available tools
- Read tool descriptions
- See tool capabilities

Built-in tools:
- **calculator**: Mathematical calculations
- **echo**: Echo input back
- **current_time**: Get current date/time
- **parse_json**: Parse JSON strings
- **string_manipulation**: String operations

### Memory Tab

**View Statistics**
- Total memories
- Short-term count
- Long-term count
- Average access count

**Actions**
- **Consolidate**: Move important memories to long-term storage
- **Clear All**: Delete all memories (with confirmation)

## API Endpoints

The web server exposes a REST API at `/api`:

### Health
```
GET /api/health
```

Returns system health status.

### Agents
```
GET /api/agents
POST /api/agents
GET /api/agents/:id
POST /api/agents/:id/execute
```

**Create Agent**:
```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "description": "A test agent",
    "capabilities": []
  }'
```

**Execute Agent**:
```bash
curl -X POST http://localhost:3000/api/agents/AGENT_ID/execute \
  -H "Content-Type: application/json" \
  -d '{
    "taskDescription": "Say hello",
    "options": {
      "maxIterations": 5
    }
  }'
```

### Tools
```
GET /api/tools
```

Returns list of available tools.

### Workflows
```
GET /api/workflows
POST /api/workflows
POST /api/workflows/:id/run
```

**Create Workflow**:
```bash
curl -X POST http://localhost:3000/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Workflow",
    "description": "A test workflow",
    "steps": [
      {
        "name": "Echo",
        "type": "fixed",
        "config": { "function": "echo" }
      }
    ]
  }'
```

### Memory
```
GET /api/memory/stats
POST /api/memory/consolidate
DELETE /api/memory
```

**Get Stats**:
```bash
curl http://localhost:3000/api/memory/stats
```

**Consolidate**:
```bash
curl -X POST http://localhost:3000/api/memory/consolidate
```

**Clear Memory**:
```bash
curl -X DELETE http://localhost:3000/api/memory
```

## Configuration

### Environment Variables

```bash
# Required: LLM API Key
export ANTHROPIC_API_KEY="your-key"
# or
export OPENAI_API_KEY="your-key"

# Optional: Server Configuration
export PORT=3000              # Server port (default: 3000)
export HOST=localhost         # Server host (default: localhost)
export LOG_LEVEL=info        # Logging level (default: info)
```

### Custom Port

```bash
PORT=8080 npm run web
```

### Multiple Providers

Set both API keys to enable provider selection:

```bash
export ANTHROPIC_API_KEY="your-anthropic-key"
export OPENAI_API_KEY="your-openai-key"
```

The server will default to Anthropic if both are set.

## Architecture

### Backend (Express)
```
src/web/server.ts
```

- Express.js server
- RESTful API endpoints
- CORS enabled
- JSON body parsing
- Static file serving
- Graceful shutdown

### Frontend (Vanilla JS)
```
src/web/public/
├── index.html    # Main HTML structure
├── styles.css    # Modern dark theme CSS
└── app.js        # Client-side JavaScript
```

- No build step required
- Vanilla JavaScript (no frameworks)
- Responsive design
- Real-time updates
- Modal dialogs
- Tab navigation

## Customization

### Theme Colors

Edit `src/web/public/styles.css`:

```css
:root {
  --primary: #3b82f6;      /* Main brand color */
  --success: #10b981;      /* Success messages */
  --danger: #ef4444;       /* Errors/warnings */
  --bg: #0f172a;          /* Background */
  --text: #f1f5f9;        /* Text color */
}
```

### Adding Features

1. **Add API Endpoint** in `src/web/server.ts`:
```typescript
app.get('/api/my-endpoint', async (req, res) => {
  // Your logic here
  res.json({ success: true, data: result });
});
```

2. **Add UI** in `src/web/public/index.html`:
```html
<div class="tab-content" id="my-tab">
  <h2>My Feature</h2>
  <!-- Your UI here -->
</div>
```

3. **Add Logic** in `src/web/public/app.js`:
```javascript
async function loadMyFeature() {
  const response = await fetch(`${API_BASE}/my-endpoint`);
  const data = await response.json();
  displayMyFeature(data);
}
```

## Deployment

### Production Build

1. Build the TypeScript:
```bash
npm run build
```

2. Set environment variables:
```bash
export NODE_ENV=production
export ANTHROPIC_API_KEY="your-key"
export PORT=80
```

3. Start the server:
```bash
node dist/web/server.js
```

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/web/server.js"]
```

Build and run:
```bash
docker build -t emissary-web .
docker run -p 3000:3000 \
  -e ANTHROPIC_API_KEY="your-key" \
  emissary-web
```

### Reverse Proxy (Nginx)

```nginx
server {
  listen 80;
  server_name emissary.example.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

### HTTPS with Let's Encrypt

```bash
certbot --nginx -d emissary.example.com
```

## Security

### API Key Protection

**⚠️ Important**: Never expose API keys in client-side code!

- API keys are stored server-side only
- Never send API keys to the frontend
- Use environment variables for secrets

### CORS Configuration

By default, CORS is enabled for all origins. For production, restrict it:

```typescript
// src/web/server.ts
app.use(cors({
  origin: 'https://yourdomain.com'
}));
```

### Rate Limiting

Add rate limiting for production:

```bash
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Authentication

For production, add authentication:

```bash
npm install express-session passport
```

See Express.js authentication guides for implementation.

## Troubleshooting

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE :::3000`

**Solution**:
```bash
# Use different port
PORT=8080 npm run web

# Or kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

### API Key Not Found

**Problem**: "No API key found" error

**Solution**:
```bash
# Set API key before starting
export ANTHROPIC_API_KEY="your-key"
npm run web
```

### CORS Errors

**Problem**: CORS policy errors in browser

**Solution**: Already configured! If issues persist, check browser console and verify server is running.

### Agent Execution Timeout

**Problem**: Agent execution takes too long

**Solution**:
- Reduce `maxIterations`
- Simplify task description
- Check network connection
- Verify LLM provider status

### Memory Not Loading

**Problem**: Memory stats show "Error loading"

**Solution**:
- Ensure memory is enabled in config
- Check memory storage directory permissions
- Restart server

## Best Practices

### 1. Development vs Production

```bash
# Development
npm run web

# Production
NODE_ENV=production node dist/web/server.js
```

### 2. Logging

Enable appropriate log levels:
```bash
# Development
LOG_LEVEL=debug npm run web

# Production
LOG_LEVEL=error npm run web
```

### 3. Error Handling

Always handle errors in the UI:
```javascript
try {
  const response = await fetch('/api/endpoint');
  const data = await response.json();

  if (!data.success) {
    alert('Error: ' + data.error);
  }
} catch (error) {
  alert('Network error');
}
```

### 4. User Feedback

Provide clear feedback for all actions:
- Loading indicators
- Success/error messages
- Disabled states during operations

### 5. Testing

Test the UI thoroughly:
- Create agents
- Execute tasks
- Check memory stats
- Verify error handling

## Screenshots

### Main Dashboard
- Header with health indicator
- Tab navigation
- Agent cards grid

### Agent Creation
- Modal dialog
- Form with validation
- Capability selection

### Execution Panel
- Agent selector
- Task description
- Configuration options
- Real-time results

### Memory Stats
- Statistics cards
- Action buttons
- Real-time updates

## Next Steps

1. Start the server: `npm run web`
2. Open http://localhost:3000
3. Create your first agent
4. Execute a task
5. Explore the features!

## Support

For issues or questions:
- Check this documentation
- Review server logs
- Test with curl to isolate UI vs API issues
- Check browser console for client-side errors
