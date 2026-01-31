#!/usr/bin/env node
/**
 * Emissary Web Server
 * REST API and web UI for Emissary
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Emissary } from '../index.js';
import { LogLevel } from '../shared/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Initialize Emissary
const emissaryConfig: any = {
  memory: {
    enabled: true,
  },
  logging: {
    level: (process.env.LOG_LEVEL as LogLevel | undefined) || LogLevel.INFO,
  },
};

if (process.env.ANTHROPIC_API_KEY) {
  emissaryConfig.llm = {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    defaultProvider: 'anthropic',
  };
}

if (process.env.OPENAI_API_KEY) {
  if (!emissaryConfig.llm) {
    emissaryConfig.llm = {};
  }
  emissaryConfig.llm.openai = {
    apiKey: process.env.OPENAI_API_KEY,
  };
  if (!emissaryConfig.llm.defaultProvider) {
    emissaryConfig.llm.defaultProvider = 'openai';
  }
}

const emissary = new Emissary(emissaryConfig);

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const health = await emissary.healthCheck();
    res.json({ success: true, data: health });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Agent endpoints
app.get('/api/agents', async (_req: Request, res: Response) => {
  try {
    const agents = await emissary.listAgents();
    res.json({
      success: true,
      data: agents.map((a) => a.toJSON()),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/agents', async (req: Request, res: Response) => {
  try {
    const { name, description, capabilities } = req.body;

    if (!name || !description) {
      res.status(400).json({
        success: false,
        error: 'Name and description are required',
      });
      return;
    }

    const agent = await emissary.createAgent(
      name,
      description,
      capabilities || []
    );

    res.json({
      success: true,
      data: agent.toJSON(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/api/agents/:id', async (req: Request, res: Response) => {
  try {
    const agentId = req.params.id;

    if (!agentId) {
      res.status(400).json({
        success: false,
        error: 'Agent ID is required',
      });
      return;
    }

    const agent = await emissary.getAgent(agentId);

    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
      return;
    }

    res.json({
      success: true,
      data: agent.toJSON(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/agents/:id/execute', async (req: Request, res: Response) => {
  try {
    const agentId = req.params.id;
    const { taskDescription, options } = req.body;

    if (!agentId) {
      res.status(400).json({
        success: false,
        error: 'Agent ID is required',
      });
      return;
    }

    if (!taskDescription) {
      res.status(400).json({
        success: false,
        error: 'Task description is required',
      });
      return;
    }

    const result = await emissary.executeAgent(
      agentId,
      taskDescription,
      options
    );

    if (result.isErr()) {
      res.status(500).json({
        success: false,
        error: (result.unwrap() as Error).message,
      });
      return;
    }

    res.json({
      success: true,
      data: result.unwrap(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Tool endpoints
app.get('/api/tools', (_req: Request, res: Response) => {
  try {
    const tools = emissary.listTools();
    res.json({
      success: true,
      data: tools.map((t) => t.getToolDefinition()),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Workflow endpoints
app.get('/api/workflows', async (_req: Request, res: Response) => {
  try {
    const workflows = await emissary.listWorkflows();
    res.json({
      success: true,
      data: workflows.map((w) => w.toJSON()),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/workflows', async (req: Request, res: Response) => {
  try {
    const { name, description, steps } = req.body;

    if (!name || !description || !steps) {
      res.status(400).json({
        success: false,
        error: 'Name, description, and steps are required',
      });
      return;
    }

    const workflow = await emissary.createWorkflow(name, description, steps);

    res.json({
      success: true,
      data: workflow.toJSON(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/workflows/:id/run', async (req: Request, res: Response) => {
  try {
    const workflowId = req.params.id;
    const { input, context } = req.body;

    if (!workflowId) {
      res.status(400).json({
        success: false,
        error: 'Workflow ID is required',
      });
      return;
    }

    const result = await emissary.runWorkflow(
      workflowId,
      input || {},
      context
    );

    if (result.isErr()) {
      res.status(500).json({
        success: false,
        error: (result.unwrap() as Error).message,
      });
      return;
    }

    res.json({
      success: true,
      data: result.unwrap(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Memory endpoints
app.get('/api/memory/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await emissary.getMemoryStats();

    if (stats.isErr()) {
      res.status(500).json({
        success: false,
        error: (stats.unwrap() as Error).message,
      });
      return;
    }

    res.json({
      success: true,
      data: stats.unwrap(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/memory/consolidate', async (_req: Request, res: Response) => {
  try {
    const result = await emissary.consolidateMemory();

    if (result.isErr()) {
      res.status(500).json({
        success: false,
        error: (result.unwrap() as Error).message,
      });
      return;
    }

    res.json({
      success: true,
      data: { consolidated: result.unwrap() },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.delete('/api/memory', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    const result = await emissary.clearMemory(type as any);

    if (result.isErr()) {
      res.status(500).json({
        success: false,
        error: (result.unwrap() as Error).message,
      });
      return;
    }

    res.json({
      success: true,
      data: { cleared: result.unwrap() },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Serve frontend
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Emissary Web Server                                 ║
║                                                           ║
║   Server:    http://${HOST}:${PORT}                         ║
║   API:       http://${HOST}:${PORT}/api                     ║
║   Status:    http://${HOST}:${PORT}/api/health              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...');

  server.close(async () => {
    await emissary.cleanup();
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n\nShutting down gracefully...');

  server.close(async () => {
    await emissary.cleanup();
    console.log('Server closed');
    process.exit(0);
  });
});
