import test from 'node:test';
import assert from 'node:assert/strict';
import { PulseSynthesizer } from '../lib/pulse.js';

test('PulseSynthesizer computes composite health score', () => {
  const pulse = new PulseSynthesizer();
  const report = pulse.synthesize({
    mirrorVerdict: 'PASS',
    lookoutVerdict: 'PASS',
    mutationScore: 85,
    hasReadme: true,
    hasLicense: true
  });

  assert.equal(report.healthScore, 9.7);
  assert.equal(report.status, 'EXCELLENT');
});
