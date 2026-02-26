import { execSync } from 'child_process';
import os from 'os';

if (os.platform() === 'win32') {
  console.log('Detected Windows. Installing oxc native bindings manually due to Node version mismatch with NPM optionalDependencies skip...');
  try {
    execSync('npm install --no-save @oxc-minify/binding-win32-x64-msvc@0.112.0 @oxc-parser/binding-win32-x64-msvc@0.112.0 @oxc-transform/binding-win32-x64-msvc@0.112.0 --ignore-engines', { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to install optional bindings', err.message);
  }
} else {
  console.log('Not on Windows, skipping manual oxc native binding installation.');
}
