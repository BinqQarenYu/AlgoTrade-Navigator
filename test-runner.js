import { run } from 'node:test';

// Run tests
const stream = run({ files: ['src/lib/bot-persistence.test.ts'] });

stream.on('test:fail', (data) => {
  console.error(data);
  process.exit(1);
});

stream.on('test:pass', (data) => {
  console.log(data.name, 'PASSED');
});

stream.on('end', () => {
  console.log('Done running tests');
  process.exit(0);
});
