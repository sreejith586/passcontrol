const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const projectRoot = process.cwd();
const tscBinary = path.join(projectRoot, 'node_modules', '.bin', 'tsc');

execFileSync(
  tscBinary,
  [
    '--module',
    'commonjs',
    '--target',
    'ES2021',
    '--skipLibCheck',
    '--outDir',
    'prisma/.seed-dist',
    'prisma/seed.ts',
  ],
  { stdio: 'inherit' },
);

const compiledSeedCandidates = [
  path.join(projectRoot, 'prisma', '.seed-dist', 'seed.js'),
  path.join(projectRoot, 'prisma', '.seed-dist', 'prisma', 'seed.js'),
];

const compiledSeedPath = compiledSeedCandidates.find((candidate) => fs.existsSync(candidate));

if (!compiledSeedPath) {
  throw new Error('Compiled Prisma seed was not found.');
}

execFileSync(process.execPath, [compiledSeedPath], { stdio: 'inherit' });
