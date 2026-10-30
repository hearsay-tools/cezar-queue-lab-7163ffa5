'use strict';
const { execFileSync } = require('node:child_process');
const PATH = 'packages/example/large.ts';
const SHA = /^[0-9a-f]{40}$/;
function git(args, cwd = process.cwd()) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 30000,
    maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
}
function validSha(sha) {
  if (!SHA.test(sha)) throw new Error('Invalid immutable SHA');
  return sha;
}
function blob(sha, cwd) {
  const spec = `${validSha(sha)}:${PATH}`;
  if (git(['cat-file', '-t', spec], cwd).trim() !== 'blob') throw new Error('Missing fixture blob');
  const size = Number(git(['cat-file', '-s', spec], cwd));
  if (!Number.isSafeInteger(size) || size > 128000) throw new Error('Fixture size bound');
  const content = git(['show', spec], cwd);
  if (!/^(?:\/\/ fixture (?:original|addition) [0-9]+\n)+$/.test(content)) throw new Error('Fixture is not inert');
  return content.split('\n').length - 1;
}
function compare(base, head, cwd) {
  const before = blob(base, cwd), after = blob(head, cwd);
  if (after > before) throw new Error(`Combined source grew: ${before} -> ${after}`);
  return { base, head, before, after };
}
function fixtureOnly(base, head, cwd) {
  const names = git(['diff', '--name-only', '-z', validSha(base), validSha(head), '--'], cwd).split('\0').filter(Boolean);
  if (names.length !== 1 || names[0] !== PATH) throw new Error('Candidate changed non-fixture paths');
  // Symlinks and executable files do not qualify as inert source.
  for (const sha of [base, head]) {
    if (!git(['ls-tree', sha, '--', PATH], cwd).startsWith('100644 blob ')) throw new Error('Invalid fixture mode');
    blob(sha, cwd);
  }
}
function fetchObject(sha, cwd) {
  validSha(sha);
  git(['fetch', '--no-tags', '--depth=1', 'origin', sha], cwd);
  if (git(['rev-parse', `${sha}^{commit}`], cwd).trim() !== sha) throw new Error('Fetched SHA mismatch');
}
module.exports = { git, blob, compare, fixtureOnly, fetchObject, validSha, PATH };
