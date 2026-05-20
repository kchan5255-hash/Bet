const { spawn } = require('child_process');

const INTERVAL_MS = Number(process.env.INTERVAL_MS || 60000);
const MERGE = process.env.MERGE || '';

let stopped = false;

function timestamp() {
  return new Date().toISOString();
}

function runOnce() {
  if (stopped) return;

  console.log(`[${timestamp()}] Refreshing odds...`);
  const child = spawn('node', ['odds-scraper.js'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      MERGE,
    },
  });

  child.on('exit', (code) => {
    if (stopped) return;
    console.log(`[${timestamp()}] Odds refresh exited with code ${code}`);
    setTimeout(runOnce, INTERVAL_MS);
  });

  child.on('error', (error) => {
    if (stopped) return;
    console.error(`[${timestamp()}] Odds refresh failed: ${error.message}`);
    setTimeout(runOnce, INTERVAL_MS);
  });
}

process.on('SIGINT', () => {
  stopped = true;
  console.log('\nStopping odds auto-refresh.');
  process.exit(0);
});

runOnce();
