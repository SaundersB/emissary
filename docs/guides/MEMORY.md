# Memory System Guide

## Introduction

Emissary's memory system enables agents to remember past interactions, learn from experience, and build up knowledge over time. The system supports both short-term (episodic) and long-term (semantic) memory with automatic consolidation and pruning.

## Core Concepts

### Memory Types

Emissary supports four types of memory:

1. **Short-Term Memory** (`MemoryType.ShortTerm`)
   - Stored in-memory for fast access
   - Temporary storage during active execution
   - Automatically pruned or consolidated

2. **Long-Term Memory** (`MemoryType.LongTerm`)
   - Persisted to disk for durability
   - Important information worth keeping
   - Survives process restarts

3. **Episodic Memory** (`MemoryType.Episodic`)
   - Records specific experiences and events
   - Tool executions, observations, results
   - Time-stamped event sequences

4. **Semantic Memory** (`MemoryType.Semantic`)
   - General knowledge and facts
   - Learned patterns and rules
   - Conceptual information

### Memory Importance

Memories are tagged with importance levels:

- **Low** (`MemoryImportance.Low`): Routine, disposable information
- **Medium** (`MemoryImportance.Medium`): Normal observations
- **High** (`MemoryImportance.High`): Important insights
- **Critical** (`MemoryImportance.Critical`): Essential knowledge

### Memory Lifecycle

```
Store → Access → Age → Prune/Consolidate
  ↓        ↓       ↓           ↓
Short-Term → Important? → Long-Term
             ↓
             Unimportant → Pruned
```

## Configuration

### Basic Setup

```typescript
import { Emissary } from 'emissary';

const emissary = new Emissary({
  llm: { /* LLM config */ },
  memory: {
    enabled: true,
    storageDir: './memory', // Where to store long-term memories
    consolidationThreshold: 100, // Auto-consolidate after N memories
    pruneInterval: 3600000, // Auto-prune every hour (in ms)
  }
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable memory system |
| `storageDir` | string | `~/.emissary/memory` | Directory for persistent storage |
| `consolidationThreshold` | number | `100` | Short-term memories before auto-consolidation |
| `pruneInterval` | number | `undefined` | Auto-prune interval in milliseconds |

## Using Memory

### Automatic Memory

Agents automatically store memories during execution:

```typescript
// Execute an agent - memories are stored automatically
const result = await emissary.executeAgent(
  agentId,
  'Calculate the sum of 15 and 27',
  { tools: ['calculator'] }
);

// Each tool execution is stored as episodic memory
// Important results may be consolidated to long-term memory
```

### Manual Memory Operations

#### Get Memory Statistics

```typescript
const stats = await emissary.getMemoryStats();

if (stats.isOk()) {
  const memStats = stats.unwrap();
  console.log('Total memories:', memStats.totalEntries);
  console.log('By type:', memStats.byType);
  console.log('By importance:', memStats.byImportance);
  console.log('Oldest entry:', memStats.oldestEntry);
  console.log('Newest entry:', memStats.newestEntry);
  console.log('Average access count:', memStats.averageAccessCount);
}
```

#### Consolidate Memories

Move important short-term memories to long-term storage:

```typescript
const result = await emissary.consolidateMemory();

if (result.isOk()) {
  const count = result.unwrap();
  console.log(`Consolidated ${count} memories`);
}
```

#### Prune Memories

Remove old or unimportant memories:

```typescript
import { MemoryImportance } from 'emissary';

// Prune memories older than 7 days with importance < Medium
const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const result = await emissary.pruneMemory(maxAge, MemoryImportance.Medium);

if (result.isOk()) {
  const count = result.unwrap();
  console.log(`Pruned ${count} memories`);
}
```

#### Clear Memories

Clear all memories or memories of a specific type:

```typescript
import { MemoryType } from 'emissary';

// Clear all short-term memories
await emissary.clearMemory(MemoryType.ShortTerm);

// Clear all memories
await emissary.clearMemory();
```

## Memory in Agent Execution

### How Agents Use Memory

During agent execution, the memory system:

1. **Retrieves relevant memories** before LLM calls
2. **Provides context** from past experiences
3. **Stores new observations** after tool executions
4. **Updates access patterns** for memory prioritization

### Example: Memory-Enhanced Agent

```typescript
// First execution - agent learns
const result1 = await emissary.executeAgent(
  agentId,
  'Find the current time',
  { tools: ['current_time'] }
);

// Memory is stored: tool='current_time', success=true

// Second execution - agent may recall past tool usage
const result2 = await emissary.executeAgent(
  agentId,
  'What time is it?',
  { tools: ['current_time'] }
);

// Agent has context that current_time tool works for time queries
```

## Advanced Usage

### Custom Memory Store

Implement your own memory store for custom backends:

```typescript
import { MemoryStore, MemoryType, MemoryQuery } from 'emissary';

class DatabaseMemoryStore implements MemoryStore {
  async store(type, content, importance, tags) {
    // Store in database
  }

  async retrieve(id) {
    // Retrieve from database
  }

  async query(query) {
    // Query database
  }

  // ... implement other methods
}
```

### Memory Queries

Query the memory system directly:

```typescript
import { MemoryType, MemoryImportance } from 'emissary';

// This requires accessing the internal memory manager
// (not exposed by default, for advanced use cases)
```

## Memory Storage

### Short-Term Storage

- Stored in-memory using JavaScript Map
- Fast access, no I/O overhead
- Lost on process restart
- Subject to automatic pruning

### Long-Term Storage

- Stored as JSON files on disk
- Structure:
  ```
  ~/.emissary/memory/
  ├── index.json       # Memory index
  ├── mem-1.json       # Individual memory files
  ├── mem-2.json
  └── ...
  ```
- Survives restarts
- Indexed for efficient queries

### Memory File Format

```json
{
  "id": "mem-123",
  "type": "episodic",
  "content": {
    "type": "tool_execution",
    "tool": "calculator",
    "input": { "expression": "15 + 27" },
    "output": 42,
    "success": true,
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "metadata": {
    "createdAt": "2024-01-15T10:30:00Z",
    "accessedAt": "2024-01-15T10:30:00Z",
    "accessCount": 1,
    "importance": 2,
    "tags": ["tool", "calculator", "exec-456"]
  }
}
```

## Best Practices

### 1. Enable Memory for Learning Agents

For agents that should learn from experience, enable memory:

```typescript
const emissary = new Emissary({
  llm: { /* config */ },
  memory: { enabled: true }
});
```

### 2. Set Appropriate Thresholds

Balance memory usage with consolidation:

```typescript
memory: {
  consolidationThreshold: 50,  // Smaller for frequent consolidation
  pruneInterval: 3600000,      // Hourly pruning
}
```

### 3. Tag Important Executions

(Advanced) When manually storing memories, use tags:

```typescript
// Tags help with retrieval and organization
tags: ['project-x', 'critical', 'user-123']
```

### 4. Monitor Memory Growth

Check stats periodically:

```typescript
const stats = await emissary.getMemoryStats();
// Monitor totalEntries to prevent unbounded growth
```

### 5. Clean Up on Shutdown

Always cleanup to flush pending writes:

```typescript
process.on('SIGINT', async () => {
  await emissary.cleanup();
  process.exit(0);
});
```

## Performance Considerations

### Memory Impact

- **Short-term**: Minimal overhead, in-memory access
- **Long-term**: File I/O for reads/writes
- **Consolidation**: CPU for selection, I/O for writing
- **Querying**: Linear scan for in-memory, indexed for files

### Optimization Tips

1. **Limit query results**: Use `limit` in queries
2. **Prune regularly**: Remove old/unimportant memories
3. **Consolidate strategically**: Don't consolidate too frequently
4. **Use tags wisely**: Tags enable faster filtering

## Troubleshooting

### Memory Not Persisting

**Problem**: Memories lost on restart

**Solution**:
- Ensure memory is enabled: `memory: { enabled: true }`
- Check storage directory permissions
- Call `emissary.cleanup()` before exit

### High Memory Usage

**Problem**: Process using too much RAM

**Solution**:
- Lower `consolidationThreshold`
- Enable auto-pruning: `pruneInterval: 3600000`
- Clear short-term memory: `emissary.clearMemory(MemoryType.ShortTerm)`

### Slow Performance

**Problem**: Agent execution slowing down

**Solution**:
- Limit memory queries: Fewer memories to scan
- Prune old memories regularly
- Use specific query filters

## Examples

See `examples/memory-example.ts` for a complete working example.

## API Reference

### Emissary Methods

```typescript
// Get memory statistics
getMemoryStats(): Promise<Result<MemoryStats, Error>>

// Clear memories
clearMemory(type?: MemoryType): Promise<Result<number, Error>>

// Consolidate memories
consolidateMemory(): Promise<Result<number, Error>>

// Prune memories
pruneMemory(maxAge?: number, minImportance?: MemoryImportance): Promise<Result<number, Error>>

// Cleanup
cleanup(): Promise<void>
```

### Types

```typescript
interface MemoryStats {
  totalEntries: number;
  byType: Record<MemoryType, number>;
  byImportance: Record<MemoryImportance, number>;
  oldestEntry?: Date;
  newestEntry?: Date;
  averageAccessCount: number;
}

enum MemoryType {
  ShortTerm = 'short-term',
  LongTerm = 'long-term',
  Episodic = 'episodic',
  Semantic = 'semantic',
}

enum MemoryImportance {
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4,
}
```

## Future Enhancements

Planned improvements to the memory system:

- **Semantic search**: Vector embeddings for similarity search
- **Memory compression**: Summarize old memories
- **Selective recall**: Smart memory retrieval based on task
- **Memory graphs**: Relationships between memories
- **Memory export/import**: Backup and restore memories
- **Multi-agent memory**: Shared memory between agents
