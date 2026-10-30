'use strict';
const { fixtureOnly } = require('./guard.cjs');
const LABEL = 'SIMULATED REVIEW, NOT MODEL REVIEW';
function simulate(base, head, cwd) {
  console.log(LABEL);
  fixtureOnly(base, head, cwd);
  return { label: LABEL, result: 'allowed inert fixture change', base, head };
}
module.exports = { simulate, LABEL };
