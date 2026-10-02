import { HackerRankAutoRunner, POPULAR_TOPICS } from './autoRunner';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

function parseDomainChoice(raw: string): string {
  const choice = raw.trim().toLowerCase();
  switch (choice) {
    case '2':
    case 'react':
    case 'frontend':
      return 'React';
    case '3':
    case 'shell':
    case 'bash':
    case 'linux':
    case 'linux shell':
      return 'Linux Shell';
    case '4':
    case 'js':
    case 'javascript':
    case '10-days-of-javascript':
      return 'JavaScript';
    case '5':
    case 'algo':
    case 'algorithm':
    case 'algorithms':
      return 'Algorithms';
    case '6':
    case 'databases':
    case 'database':
    case 'relational-algebra':
      return 'Databases';
    case '7':
    case 'all':
      return 'All';
    case '1':
    case 'sql':
    default:
      return 'SQL';
  }
}

async function promptDomainSelection(): Promise<string> {
  // Check CLI arguments for domain flags e.g. --domain=shell, --domain=3, -d=3, etc.
  const args = process.argv.slice(2);
  const domainArg = args.find(a => a.startsWith('--domain=') || a.startsWith('-d='));
  if (domainArg) {
    const val = domainArg.split('=')[1];
    return parseDomainChoice(val);
  }
  const domainIdx = args.findIndex(a => a === '--domain' || a === '-d');
  if (domainIdx !== -1 && args[domainIdx + 1]) {
    return parseDomainChoice(args[domainIdx + 1]);
  }

  // Check positional args like `tsx cli.ts 3` or `tsx cli.ts shell`
  const positionalDomain = args.find(a => !a.startsWith('-'));
  if (positionalDomain) {
    return parseDomainChoice(positionalDomain);
  }

  console.log('=====================================================');
  console.log('🎯 SELECT HACKERRANK DOMAIN TO SOLVE:');
  console.log('=====================================================');
  console.log(' [1] SQL (Basic Select, Advanced Select, Aggregations, Joins)');
  console.log(' [2] React (Components, State, Lifecycle, Hooks)');
  console.log(' [3] Linux Shell (Bash, Text Processing, Grep, Sed, Awk)');
  console.log(' [4] JavaScript (10 Days of JavaScript)');
  console.log(' [5] Algorithms (Problem Solving)');
  console.log(' [6] Databases (Relational Algebra, Sets & Relations, Normalization)');
  console.log(' [7] All Domains (Full Multi-Track Crawl)');
  console.log('=====================================================');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('👉 Enter choice [1-7] (Default: 1 - SQL): ', (answer) => {
      try { rl.close(); } catch {}
      const cleaned = answer ? answer.trim() : '';
      const selected = parseDomainChoice(cleaned || '1');
      resolve(selected);
    });
  });
}

async function main() {
  console.log('=====================================================');
  console.log('🤖 HackerRank Full Auto-Solver Assistant');
  console.log('=====================================================');
  console.log(`🧠 AI Provider: ${process.env.AI_PROVIDER || 'openrouter'}`);
  console.log(`🎯 Model: ${process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free'}`);
  console.log(`👤 User: ${process.env.HACKERRANK_EMAIL || 'Configured in .env'}`);
  console.log('=====================================================\n');

  // Prompt user for domain selection
  const selectedDomain = await promptDomainSelection();
  console.log(`\n✅ Active Domain Selected: ${selectedDomain.toUpperCase()}\n`);

  const runner = new HackerRankAutoRunner();

  // Check command-line arguments for modes
  const args = process.argv.slice(2);
  const autoSubmit = !args.includes('--no-submit') && !args.includes('--test-only');
  const noTypingAnim = args.includes('--instant') || args.includes('--no-typing-anim');
  const animatedTyping = !noTypingAnim;

  console.log(`⚡ Auto Submit Mode: ${autoSubmit ? 'ENABLED (Auto-Submits & Advances to Next Problem)' : 'DISABLED (Review & Test only)'}`);
  console.log(`⌨️ Typing Animation: ${animatedTyping ? 'ENABLED (Simulated Real-time)' : 'DISABLED (Instant)'}`);
  console.log('🚀 Launching automated workflow...\n');

  await runner.runFullAutoLoop(autoSubmit, animatedTyping, selectedDomain);
}

main().catch((err) => {
  console.error('Fatal Runner Error:', err);
  process.exit(1);
});
