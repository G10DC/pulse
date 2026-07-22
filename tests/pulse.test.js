import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PulseSynthesizer } from '../lib/pulse.js';

describe('PulseSynthesizer', () => {
  it('evaluates project health correctly for complete project', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-test-'));
    fs.mkdirSync(path.join(tmpDir, 'tests'));
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ scripts: { test: 'node --test' } }));
    fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), '{}');
    fs.writeFileSync(path.join(tmpDir, '.gitignore'), 'node_modules');
    fs.writeFileSync(path.join(tmpDir, 'eslint.config.js'), 'export default [];');
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Test Project');
    fs.writeFileSync(path.join(tmpDir, 'LICENSE'), 'MIT');

    const synthesizer = new PulseSynthesizer();
    const res = synthesizer.evaluateProject(tmpDir);

    assert.strictEqual(res.score >= 8.0, true);
    assert.strictEqual(res.breakdown.testing, 2.5);
    assert.strictEqual(res.breakdown.security, 2.5);
    assert.strictEqual(res.breakdown.docs, 2.0);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
