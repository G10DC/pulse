import fs from 'fs';
import path from 'path';

/**
 * Pulse Health Evaluator
 */
export class PulseSynthesizer {
  evaluateProject(dirPath) {
    const scores = {
      testing: 0,
      security: 0,
      linters: 0,
      docs: 0
    };

    const has = file => fs.existsSync(path.join(dirPath, file));

    // 1. Testing (max 2.5)
    if (has('tests') || has('test') || has('spec')) scores.testing += 1.5;
    if (has('package.json')) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(dirPath, 'package.json'), 'utf8'));
        if (pkg.scripts && pkg.scripts.test) scores.testing += 1.0;
      } catch (e) {}
    }

    // 2. Security (max 2.5)
    if (has('package-lock.json') || has('yarn.lock') || has('pnpm-lock.yaml')) scores.security += 1.5;
    if (has('.gitignore')) scores.security += 1.0;

    // 3. Linters (max 2.5)
    if (has('eslint.config.js') || has('.eslintrc') || has('.eslintrc.json')) scores.linters += 1.5;
    if (has('.prettierrc') || has('prettier.config.js')) scores.linters += 1.0;

    // 4. Docs (max 2.5)
    if (has('README.md')) scores.docs += 1.0;
    if (has('LICENSE')) scores.docs += 1.0;
    if (has('CHANGELOG.md')) scores.docs += 0.5;

    const totalScore = scores.testing + scores.security + scores.linters + scores.docs;

    return {
      score: parseFloat(totalScore.toFixed(1)),
      breakdown: scores
    };
  }

  formatReport(result) {
    let out = `# 🧬 Pulse Project Health Score: ${result.score} / 10\n\n`;
    out += `### Score Breakdown:\n`;
    out += `- **Testing**: ${result.breakdown.testing} / 2.5\n`;
    out += `- **Security & Lockfiles**: ${result.breakdown.security} / 2.5\n`;
    out += `- **Code Style & Linters**: ${result.breakdown.linters} / 2.5\n`;
    out += `- **Documentation**: ${result.breakdown.docs} / 2.5\n`;
    return out;
  }
}

// CLI Handler
if (process.argv[1] && process.argv[1].endsWith('pulse.js')) {
  const args = process.argv.slice(2);
  const synthesizer = new PulseSynthesizer();
  const dirIdx = args.indexOf('--dir');
  const dirPath = dirIdx !== -1 && args[dirIdx + 1] ? path.resolve(args[dirIdx + 1]) : process.cwd();

  const res = synthesizer.evaluateProject(dirPath);
  console.log(synthesizer.formatReport(res));
}
