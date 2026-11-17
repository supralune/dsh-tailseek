import { spawn } from 'node:child_process';
const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error('Pass the Harness executable and arguments');
const child = spawn(command, args, { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
function pipe(stream, output) {
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', text => {
    buffer += text;
    const lines = buffer.split('\n'); buffer = lines.pop();
    for (const line of lines) output.write(line.replace(/([?&]token=)[^\s&#]+/g, '$1[redacted]') + '\n');
  });
}
pipe(child.stdout, process.stdout); pipe(child.stderr, process.stderr);
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 1; });
