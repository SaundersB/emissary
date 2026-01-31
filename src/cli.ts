#!/usr/bin/env node
/**
 * Emissary CLI
 * Command-line interface for running agents and workflows
 */

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { Emissary, Capability, Agent } from './index.js';
import { LogLevel } from './shared/utils/logger.js';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * CLI Configuration
 */
interface CLIConfig {
  anthropicApiKey?: string;
  openaiApiKey?: string;
  defaultProvider?: 'anthropic' | 'openai';
  logLevel?: LogLevel;
}

/**
 * Config file path
 */
const CONFIG_DIR = join(homedir(), '.emissary');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const AGENTS_FILE = join(CONFIG_DIR, 'agents.json');

/**
 * Load configuration
 */
async function loadConfig(): Promise<CLIConfig> {
  try {
    if (existsSync(CONFIG_FILE)) {
      const data = await readFile(CONFIG_FILE, 'utf-8');
      return JSON.parse(data) as CLIConfig;
    }
  } catch (error) {
    // Config file doesn't exist or is invalid
  }

  // Return default config with environment variables
  return {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    defaultProvider: process.env.DEFAULT_LLM_PROVIDER as 'anthropic' | 'openai',
    logLevel: LogLevel.INFO,
  };
}

/**
 * Save configuration
 */
async function saveConfig(config: CLIConfig): Promise<void> {
  const { mkdir } = await import('fs/promises');
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Initialize Emissary instance
 */
async function initEmissary(config: CLIConfig): Promise<Emissary> {
  const emissaryConfig: any = {
    logging: {
      level: config.logLevel ?? LogLevel.INFO,
    },
  };

  if (config.anthropicApiKey || config.openaiApiKey) {
    emissaryConfig.llm = {};

    if (config.anthropicApiKey) {
      emissaryConfig.llm.anthropic = {
        apiKey: config.anthropicApiKey,
      };
    }

    if (config.openaiApiKey) {
      emissaryConfig.llm.openai = {
        apiKey: config.openaiApiKey,
      };
    }

    if (config.defaultProvider) {
      emissaryConfig.llm.defaultProvider = config.defaultProvider;
    }
  }

  return new Emissary(emissaryConfig);
}

/**
 * Save agents to file
 */
async function saveAgents(agents: Agent[]): Promise<void> {
  const { mkdir } = await import('fs/promises');
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(
    AGENTS_FILE,
    JSON.stringify(
      agents.map((a) => a.toJSON()),
      null,
      2
    )
  );
}

/**
 * Create CLI program
 */
const program = new Command();

program
  .name('emissary')
  .description('AI-powered agentic framework with clean architecture')
  .version('0.1.0');

/**
 * Configure command
 */
program
  .command('config')
  .description('Configure Emissary settings')
  .action(async () => {
    const config = await loadConfig();

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'anthropicApiKey',
        message: 'Anthropic API Key:',
        default: config.anthropicApiKey,
      },
      {
        type: 'input',
        name: 'openaiApiKey',
        message: 'OpenAI API Key:',
        default: config.openaiApiKey,
      },
      {
        type: 'list',
        name: 'defaultProvider',
        message: 'Default LLM Provider:',
        choices: ['anthropic', 'openai'],
        default: config.defaultProvider ?? 'anthropic',
      },
      {
        type: 'list',
        name: 'logLevel',
        message: 'Log Level:',
        choices: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'SILENT'],
        default: LogLevel[config.logLevel ?? LogLevel.INFO],
      },
    ]);

    const newConfig: CLIConfig = {
      anthropicApiKey: answers.anthropicApiKey || undefined,
      openaiApiKey: answers.openaiApiKey || undefined,
      defaultProvider: answers.defaultProvider,
      logLevel: LogLevel[answers.logLevel as keyof typeof LogLevel],
    };

    await saveConfig(newConfig);
    console.log(chalk.green('✓ Configuration saved'));
  });

/**
 * Agent commands
 */
const agentCmd = program.command('agent').description('Manage agents');

agentCmd
  .command('create')
  .description('Create a new agent')
  .action(async () => {
    const config = await loadConfig();
    const emissary = await initEmissary(config);

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Agent Name:',
        validate: (input) => input.trim().length > 0,
      },
      {
        type: 'input',
        name: 'description',
        message: 'Agent Description:',
        validate: (input) => input.trim().length > 0,
      },
      {
        type: 'checkbox',
        name: 'capabilities',
        message: 'Select Capabilities:',
        choices: Object.values(Capability).map((c) => ({ name: c, value: c })),
      },
    ]);

    const spinner = ora('Creating agent...').start();

    try {
      const agent = await emissary.createAgent(
        answers.name,
        answers.description,
        answers.capabilities
      );

      const allAgents = await emissary.listAgents();
      await saveAgents(allAgents);

      spinner.succeed('Agent created');
      console.log(chalk.cyan(`ID: ${agent.id.toString()}`));
      console.log(chalk.cyan(`Name: ${agent.name}`));
      console.log(chalk.cyan(`Capabilities: ${answers.capabilities.join(', ') || 'none'}`));
    } catch (error) {
      spinner.fail('Failed to create agent');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

agentCmd
  .command('list')
  .description('List all agents')
  .action(async () => {
    const config = await loadConfig();
    const emissary = await initEmissary(config);

    const spinner = ora('Loading agents...').start();

    try {
      const agents = await emissary.listAgents();

      if (agents.length === 0) {
        spinner.info('No agents found');
        console.log(chalk.yellow('Create an agent with: emissary agent create'));
        return;
      }

      spinner.succeed(`Found ${agents.length} agent(s)`);
      console.log();

      agents.forEach((agent) => {
        console.log(chalk.bold(agent.name));
        console.log(chalk.gray(`  ID: ${agent.id.toString()}`));
        console.log(chalk.gray(`  Description: ${agent.description}`));
        console.log(
          chalk.gray(`  Capabilities: ${agent.getCapabilities().join(', ') || 'none'}`)
        );
        console.log();
      });
    } catch (error) {
      spinner.fail('Failed to list agents');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

agentCmd
  .command('run <agentId> <task>')
  .description('Run an agent with a task')
  .option('-t, --tools <tools>', 'Comma-separated list of tools to use')
  .option('-i, --iterations <number>', 'Maximum iterations', '10')
  .option('--timeout <ms>', 'Timeout in milliseconds', '300000')
  .action(async (agentId: string, task: string, options) => {
    const config = await loadConfig();
    const emissary = await initEmissary(config);

    const spinner = ora('Executing agent...').start();

    try {
      const tools = options.tools ? options.tools.split(',').map((t: string) => t.trim()) : undefined;

      const result = await emissary.executeAgent(agentId, task, {
        maxIterations: parseInt(options.iterations),
        timeout: parseInt(options.timeout),
        tools,
      });

      if (result.isErr()) {
        throw result.unwrap();
      }

      const response = result.unwrap();

      if (response.success) {
        spinner.succeed('Agent execution completed');
        console.log();
        console.log(chalk.bold('Result:'));
        console.log(response.output);
        console.log();
        console.log(chalk.gray(`Iterations: ${response.iterations.length}`));
        console.log(chalk.gray(`Duration: ${response.metadata.duration}ms`));

        if (response.iterations.length > 0) {
          console.log();
          console.log(chalk.bold('Execution Trace:'));
          response.iterations.forEach((iter, idx) => {
            console.log(chalk.cyan(`\n[Iteration ${idx + 1}]`));
            console.log(chalk.gray('Thought:'), iter.thought.substring(0, 200));
            console.log(chalk.gray('Action:'), iter.action);
            if (iter.observation) {
              console.log(chalk.gray('Observation:'), iter.observation.substring(0, 200));
            }
          });
        }
      } else {
        spinner.fail('Agent execution failed');
        console.error(chalk.red(response.error ?? 'Unknown error'));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail('Agent execution failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Tool commands
 */
const toolCmd = program.command('tool').description('Manage tools');

toolCmd
  .command('list')
  .description('List available tools')
  .action(async () => {
    const config = await loadConfig();
    const emissary = await initEmissary(config);

    const spinner = ora('Loading tools...').start();

    try {
      const tools = emissary.listTools();

      if (tools.length === 0) {
        spinner.info('No tools found');
        return;
      }

      spinner.succeed(`Found ${tools.length} tool(s)`);
      console.log();

      tools.forEach((tool) => {
        console.log(chalk.bold(tool.name));
        console.log(chalk.gray(`  Description: ${tool.description}`));
        const params = tool.getSchema().required?.join(', ') || 'none';
        console.log(chalk.gray(`  Required Parameters: ${params}`));
        console.log();
      });
    } catch (error) {
      spinner.fail('Failed to list tools');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Workflow commands
 */
const workflowCmd = program.command('workflow').description('Manage workflows');

workflowCmd
  .command('list')
  .description('List all workflows')
  .action(async () => {
    const config = await loadConfig();
    const emissary = await initEmissary(config);

    const spinner = ora('Loading workflows...').start();

    try {
      const workflows = await emissary.listWorkflows();

      if (workflows.length === 0) {
        spinner.info('No workflows found');
        return;
      }

      spinner.succeed(`Found ${workflows.length} workflow(s)`);
      console.log();

      workflows.forEach((workflow) => {
        console.log(chalk.bold(workflow.name));
        console.log(chalk.gray(`  ID: ${workflow.id.toString()}`));
        console.log(chalk.gray(`  Description: ${workflow.description}`));
        console.log(chalk.gray(`  Steps: ${workflow.getSteps().length}`));
        console.log();
      });
    } catch (error) {
      spinner.fail('Failed to list workflows');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Plugin commands
 */
const pluginCmd = program.command('plugin').description('Manage plugins');

pluginCmd
  .command('load <path>')
  .description('Load a plugin from a directory')
  .option('-f, --force', 'Force reload if already loaded')
  .action(async (path: string, options) => {
    const config = await loadConfig();
    const emissary = await initEmissary(config);

    const spinner = ora('Loading plugin...').start();

    try {
      const result = await emissary.loadPlugin(path, options.force);

      if (result.isErr()) {
        throw result.unwrap();
      }

      const response = result.unwrap();

      spinner.succeed('Plugin loaded');
      console.log(chalk.cyan(`Name: ${response.manifest.name}`));
      console.log(chalk.cyan(`Type: ${response.manifest.type}`));
      console.log(chalk.cyan(`Version: ${response.manifest.version}`));
    } catch (error) {
      spinner.fail('Failed to load plugin');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

pluginCmd
  .command('list')
  .description('List loaded plugins')
  .action(async () => {
    const config = await loadConfig();
    const emissary = await initEmissary(config);

    const spinner = ora('Loading plugins...').start();

    try {
      const result = await emissary.listPlugins();

      if (result.isErr()) {
        throw result.unwrap();
      }

      const plugins = result.unwrap();

      if (plugins.length === 0) {
        spinner.info('No plugins loaded');
        return;
      }

      spinner.succeed(`Found ${plugins.length} plugin(s)`);
      console.log();

      plugins.forEach((plugin) => {
        console.log(chalk.bold(plugin.name));
        console.log(chalk.gray(`  Type: ${plugin.type}`));
        console.log(chalk.gray(`  Version: ${plugin.version}`));
        console.log(chalk.gray(`  Trust Level: ${plugin.trustLevel}`));
        console.log();
      });
    } catch (error) {
      spinner.fail('Failed to list plugins');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Status command
 */
program
  .command('status')
  .description('Check Emissary system status')
  .action(async () => {
    const config = await loadConfig();
    const emissary = await initEmissary(config);

    const spinner = ora('Checking status...').start();

    try {
      const health = await emissary.healthCheck();

      spinner.stop();

      console.log();
      console.log(
        chalk.bold('System Status:'),
        health.healthy ? chalk.green('✓ Healthy') : chalk.red('✗ Unhealthy')
      );
      console.log();
      console.log(chalk.bold('LLM Providers:'));
      Object.entries(health.providers).forEach(([name, healthy]) => {
        const status = healthy ? chalk.green('✓') : chalk.red('✗');
        console.log(`  ${status} ${name}`);
      });
      console.log();
      console.log(chalk.bold('Resources:'));
      console.log(chalk.gray(`  Tools: ${health.tools}`));
      console.log(chalk.gray(`  Agents: ${health.agents}`));
      console.log(chalk.gray(`  Workflows: ${health.workflows}`));
    } catch (error) {
      spinner.fail('Failed to check status');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

/**
 * Interactive mode
 */
program
  .command('interactive')
  .alias('i')
  .description('Start interactive mode')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🤖 Emissary Interactive Mode\n'));

    const config = await loadConfig();
    const emissary = await initEmissary(config);

    // Load agents
    const agents = await emissary.listAgents();

    if (agents.length === 0) {
      console.log(chalk.yellow('No agents found. Create one first with: emissary agent create'));
      process.exit(0);
    }

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select an agent:',
        choices: agents.map((a) => ({
          name: `${a.name} - ${a.description}`,
          value: a.id.toString(),
        })),
      },
      {
        type: 'input',
        name: 'task',
        message: 'What task would you like the agent to perform?',
        validate: (input) => input.trim().length > 0,
      },
      {
        type: 'checkbox',
        name: 'tools',
        message: 'Select tools to use (optional):',
        choices: emissary.listTools().map((t) => ({ name: t.name, value: t.name })),
      },
      {
        type: 'number',
        name: 'maxIterations',
        message: 'Maximum iterations:',
        default: 10,
      },
    ]);

    const spinner = ora('Executing agent...').start();

    try {
      const result = await emissary.executeAgent(answers.agentId, answers.task, {
        maxIterations: answers.maxIterations,
        tools: answers.tools.length > 0 ? answers.tools : undefined,
      });

      if (result.isErr()) {
        throw result.unwrap();
      }

      const response = result.unwrap();

      if (response.success) {
        spinner.succeed('Agent execution completed');
        console.log();
        console.log(chalk.bold.green('Result:'));
        console.log(response.output);
        console.log();
        console.log(chalk.gray(`Iterations: ${response.iterations.length}`));
        console.log(chalk.gray(`Duration: ${response.metadata.duration}ms`));
      } else {
        spinner.fail('Agent execution failed');
        console.error(chalk.red(response.error ?? 'Unknown error'));
        process.exit(1);
      }
    } catch (error) {
      spinner.fail('Agent execution failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// Parse and execute
program.parse();
