/**
 * Post-install fix for discord.js-selfbot-v13 bug:
 * ClientUserSettingManager crashes when friend_source_flags is null.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, 'node_modules', 'discord.js-selfbot-v13', 'src', 'managers', 'ClientUserSettingManager.js');

try {
  let content = readFileSync(filePath, 'utf8');
  const buggyLine = 'const fsf = data.friend_source_flags;';
  const fixedLine = 'const fsf = data.friend_source_flags || {};';
  if (content.includes(buggyLine)) {
    content = content.replace(buggyLine, fixedLine);
    writeFileSync(filePath, content, 'utf8');
    console.log('[fix-lib] ✅ Patched friend_source_flags bug');
  } else if (content.includes(fixedLine)) {
    console.log('[fix-lib] ✅ Already patched');
  } else {
    console.log('[fix-lib] ⚠️ Could not find the line to patch — check manually');
  }
} catch (e) {
  console.warn('[fix-lib] ⚠️ Patch failed:', e.message);
}
