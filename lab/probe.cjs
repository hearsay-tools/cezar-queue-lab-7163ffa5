'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { compare, fixtureOnly, fetchObject } = require('./guard.cjs');
const { simulate, LABEL } = require('./review-simulation.cjs');
const { QUEUE_QUERY, mergeQueueAdmission } = require('../.github/scripts/merge-queue-admission.cjs');
const { queueCiProof } = require('../.github/scripts/queue-ci-proof.cjs');
const REPO = 'hearsay-tools/cezar-queue-lab-7163ffa5';
const SNAPSHOT_QUERY = QUEUE_QUERY.replace('id position', 'id position state enqueuedAt');
const pick = (v, keys) => Object.fromEntries(keys.filter(k => v?.[k] !== undefined).map(k => [k, v[k]]));
function runFields(r) {
  return { ...pick(r, ['id','run_attempt','workflow_id','path','event','head_sha','head_branch','status','conclusion','created_at','updated_at','run_started_at']),
    repository: pick(r?.repository, ['full_name']), head_repository: pick(r?.head_repository, ['full_name']),
    pull_requests: r?.pull_requests?.map(p => ({ number: p.number, head: pick(p.head, ['sha','ref']), base: pick(p.base, ['sha','ref']) })) };
}
function project(data, route) {
  if (route === 'POST /graphql') {
    const repo = data?.data?.repository;
    return { graphqlErrors: Boolean(data?.errors), queue: repo?.mergeQueue,
      threads: repo?.pullRequest?.reviewThreads ? {
        nodes: repo.pullRequest.reviewThreads.nodes?.map(t => pick(t, ['id','isResolved'])),
        pageInfo: pick(repo.pullRequest.reviewThreads.pageInfo, ['hasNextPage','endCursor']) } : undefined };
  }
  if (route.includes('/rules/branches/')) return data;
  if (route.endsWith('/jobs')) return { total_count: data.total_count,
    jobs: data.jobs?.map(j => pick(j, ['id','name','status','conclusion','started_at','completed_at','run_id','run_attempt'])) };
  if (route.endsWith('/runs')) return { total_count: data.total_count, workflow_runs: data.workflow_runs?.map(runFields) };
  if (route.includes('/runs/')) return runFields(data);
  if (route.includes('/pulls/')) return { ...pick(data, ['number','state','draft','merged','merge_commit_sha']),
    base: { ...pick(data.base, ['ref','sha']), repo: pick(data.base?.repo, ['full_name']) },
    head: { ...pick(data.head, ['ref','sha']), repo: pick(data.head?.repo, ['full_name']) } };
  return pick(data, ['id','path','state']);
}
function eventFields(context) {
  const p = context.payload;
  return { label: LABEL, event: context.eventName, ref: context.ref, sha: context.sha,
    repository: `${context.repo.owner}/${context.repo.repo}`, run_id: process.env.GITHUB_RUN_ID,
    run_attempt: process.env.GITHUB_RUN_ATTEMPT,
    merge_group: pick(p.merge_group, ['base_sha','head_sha','base_ref','head_ref']),
    pull_request: p.pull_request ? { number: p.pull_request.number,
      head: pick(p.pull_request.head, ['sha','ref']), base: pick(p.pull_request.base, ['sha','ref']) } : undefined };
}
function recorder(github, evidence, save) {
  let calls = 0;
  const deadline = Date.now() + 120000;
  return { request: async (route, args) => {
    if (++calls > 128 || Date.now() >= deadline) throw new Error('Lab request bound');
    const allowed = route.startsWith('GET /repos/{owner}/{repo}/') || route === 'POST /graphql';
    if (!allowed || args.owner !== 'hearsay-tools' || args.repo !== 'cezar-queue-lab-7163ffa5') throw new Error('Lab request scope');
    const record = { route, request: pick(args, ['workflow_id','run_id','head_sha','event','page','per_page','filter','branch','pull_number']), at: new Date().toISOString() };
    evidence.requests.push(record); save();
    try {
      const result = await github.request(route, { ...args, request: { timeout: Math.min(10000, deadline-Date.now()), retries: 0 } });
      if (Buffer.byteLength(JSON.stringify(result.data)) > 2 * 1024 * 1024) throw new Error('Lab response bound');
      record.response = project(result.data, route); save();
      return result;
    } catch (error) {
      record.status = Number.isInteger(error?.status) ? error.status : null;
      record.failed = true; save();
      throw new Error('Lab request failed; inspect retained route and status evidence');
    }
  } };
}
async function execute({ github, context, core, mode }) {
  if (`${context.repo.owner}/${context.repo.repo}` !== REPO) throw new Error('Wrong lab repository');
  const dir = path.join(process.env.RUNNER_TEMP, 'lab-evidence'); fs.mkdirSync(dir, { recursive: true });
  const evidence = { event: eventFields(context), mode, requests: [] };
  const save = () => {
    const text = JSON.stringify(evidence, null, 2);
    if (Buffer.byteLength(text) > 4 * 1024 * 1024) throw new Error('Evidence bound');
    fs.writeFileSync(path.join(dir, `${mode}.json`), text+'\n');
  };
  save(); const wrapped = recorder(github, evidence, save);
  core.info(LABEL); await core.summary.addHeading(LABEL).write();
  try {
    // Capture the actual entry BEFORE any helper or guard can refuse it.
    if (context.eventName === 'merge_group') {
      await wrapped.request('POST /graphql', { ...context.repo, query: SNAPSHOT_QUERY, variables: context.repo });
    }
    if (mode === 'admission') evidence.result = await mergeQueueAdmission({ github: wrapped, ...context.repo, group: context.payload.merge_group });
    else if (mode === 'proof') {
      core.setOutput('verified','false');
      evidence.result = await queueCiProof({ github: wrapped, ...context.repo, eventName: context.eventName, ref: context.ref, sha: context.sha });
      core.setOutput('verified',String(evidence.result.verified));
    } else {
      const base = context.payload.merge_group?.base_sha || context.payload.pull_request?.base.sha;
      const head = context.payload.merge_group?.head_sha || context.payload.pull_request?.head.sha;
      fetchObject(base); fetchObject(head);
      fixtureOnly(base, head);
      evidence.result = mode === 'simulate' ? simulate(base, head) : compare(base, head);
    }
    save(); await core.summary.addCodeBlock(JSON.stringify(evidence.result)).write();
  } catch (error) {
    // Only our fixed helper/fixture diagnostics; never persist an API error object.
    const message = error instanceof Error ? error.message : '';
    evidence.failure = /^[A-Za-z0-9 .,:;_/>=-]{1,160}$/.test(message) ? message : 'Lab operation refused';
    save(); core.setFailed(evidence.failure);
  }
}
module.exports = { execute, eventFields, project, recorder, runFields };
