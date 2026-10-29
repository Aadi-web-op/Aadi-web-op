// Handles one tic-tac-toe issue. Called by .github/workflows/tic-tac-toe.yml with:
//   ISSUE_TITLE  "ttt|move|<0-8>" or "ttt|new"
//   PLAYER       the issue author's login
// Writes the reply for the issue to $REPLY_FILE (default: reply.md).
import { readFile, writeFile } from 'node:fs/promises';
import { newGame, play, renderSection } from './engine.mjs';

const STATE = 'data/ttt.json';
const REPO = process.env.GITHUB_REPOSITORY || 'Aadi-web-op/Aadi-web-op';

async function writeBoard(markup) {
  const text = await readFile('README.md', 'utf8');
  const re = /(<!-- BEGIN:ttt -->)[\s\S]*?(<!-- END:ttt -->)/;
  if (!re.test(text)) throw new Error('README.md has no ttt markers');
  await writeFile('README.md', text.replace(re, (m, a, b) => `${a}\n${markup.trim()}\n${b}`));
}

const title = (process.env.ISSUE_TITLE || '').trim();
const player = process.env.PLAYER || 'someone';
const state = JSON.parse(await readFile(STATE, 'utf8'));

let result;
const [, action, arg] = title.split('|');
if (action === 'new') {
  if (state.status === 'playing' && state.moves.length) {
    result = { ok: false, reply: 'A game is already in progress. Jump in and play the next move on the profile.' };
  } else {
    Object.assign(state, newGame(state.record, state.recent), { winLine: undefined });
    result = { ok: true, reply: 'New board is up. Your move: https://github.com/Aadi-web-op' };
  }
} else if (action === 'move') {
  result = play(state, Number(arg), player);
} else {
  result = { ok: false, reply: 'I did not understand that move. Use the board on the profile.' };
}

if (result.ok) {
  await writeFile(STATE, `${JSON.stringify(state, null, 2)}\n`);
  await writeBoard(renderSection(state, REPO));
}
await writeFile(process.env.REPLY_FILE || 'reply.md', `${result.reply}\n`);
console.log(result.ok ? `applied: ${title} by @${player}` : `rejected: ${title} (${result.reply})`);
