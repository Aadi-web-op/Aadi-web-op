// Tic-tac-toe played through GitHub Issues. Visitors are X, the minimax AI is O.
// Kept dependency-free so the issue workflow runs without `npm ci`.
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

export const newGame = (record = { human: 0, ai: 0, draw: 0 }, recent = []) => ({
  board: Array(9).fill(''),
  status: 'playing',
  moves: [],
  record,
  recent,
});

export function winner(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { mark: board[a], line };
  }
  return board.every(Boolean) ? { mark: 'draw', line: [] } : null;
}

// Perfect play; among equally good moves it picks at random so games do not repeat.
function minimax(board, turn, depth) {
  const w = winner(board);
  if (w) return { score: w.mark === 'O' ? 10 - depth : w.mark === 'X' ? depth - 10 : 0 };
  const results = [];
  board.forEach((v, i) => {
    if (v) return;
    board[i] = turn;
    results.push({ cell: i, score: minimax(board, turn === 'O' ? 'X' : 'O', depth + 1).score });
    board[i] = '';
  });
  const best = turn === 'O' ? Math.max(...results.map((r) => r.score)) : Math.min(...results.map((r) => r.score));
  const top = results.filter((r) => r.score === best);
  return top[Math.floor(Math.random() * top.length)];
}

export const aiMove = (board) => minimax([...board], 'O', 0).cell;

/** Applies a visitor's move and the AI's reply. Returns the reply text for the issue. */
export function play(state, cell, player, now = new Date().toISOString()) {
  if (state.status !== 'playing') return { ok: false, reply: 'This game is already over. Start a new one from the profile.' };
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) return { ok: false, reply: `\`${cell}\` is not a square on the board.` };
  if (state.board[cell]) return { ok: false, reply: `Square ${cell + 1} is already taken. Pick an empty one on the profile.` };

  state.board[cell] = 'X';
  state.moves.push({ player, mark: 'X', cell, at: now });
  let w = winner(state.board);
  let ai = null;
  if (!w) {
    ai = aiMove(state.board);
    state.board[ai] = 'O';
    state.moves.push({ player: 'minimax', mark: 'O', cell: ai, at: now });
    w = winner(state.board);
  }
  if (w) finish(state, w, player, now);

  const reply = !w
    ? `You took square ${cell + 1}, the AI answered with square ${ai + 1}. Your move: ${profileLink()}`
    : w.mark === 'X' ? `You beat the minimax AI. That should not be possible, so please tell me how. 👀 ${profileLink()}`
      : w.mark === 'O' ? `The AI completed a line with square ${ai + 1} and wins this one. Rematch: ${profileLink()}`
        : `Draw. Against perfect play, that is the best possible result. Rematch: ${profileLink()}`;
  return { ok: true, reply };
}

function finish(state, w, player, now) {
  state.status = w.mark === 'X' ? 'human' : w.mark === 'O' ? 'ai' : 'draw';
  state.winLine = w.line;
  state.record[state.status === 'human' ? 'human' : state.status === 'ai' ? 'ai' : 'draw']++;
  const players = [...new Set(state.moves.filter((m) => m.mark === 'X').map((m) => m.player))];
  state.recent = [{ players, result: state.status, at: now }, ...state.recent].slice(0, 5);
}

const profileLink = () => 'https://github.com/Aadi-web-op';

const issueUrl = (repo, title, body) =>
  `https://github.com/${repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;

const BODY = 'Just press "Create". A GitHub Action plays the AI\'s reply and updates the board on the profile within a minute.';

/** README markup for the board, the status line and the scoreboard. */
export function renderSection(state, repo) {
  const cells = state.board.map((v, i) => {
    const won = state.winLine?.includes(i);
    if (!v) {
      const img = `<img src="assets/ttt/empty.svg" width="88" alt="Empty square ${i + 1}">`;
      return state.status === 'playing' ? `<a href="${issueUrl(repo, `ttt|move|${i}`, BODY)}">${img}</a>` : img;
    }
    const kind = `${v.toLowerCase()}${won ? '-win' : ''}`;
    return `<img src="assets/ttt/${kind}.svg" width="88" alt="${v} on square ${i + 1}">`;
  });
  const rows = [0, 3, 6].map((r) => cells.slice(r, r + 3).join('')).join('<br>\n');

  const lastHuman = [...state.moves].reverse().find((m) => m.mark === 'X');
  const status = {
    playing: state.moves.length
      ? `<b>Your move.</b> Last played by <a href="https://github.com/${lastHuman.player}">@${lastHuman.player}</a>. Click any empty square.`
      : '<b>Your move.</b> Click any empty square to start a game.',
    human: '<b>A human won.</b> The minimax AI has been beaten.',
    ai: '<b>The AI wins this round.</b>',
    draw: '<b>Draw.</b> Against perfect play, that is a win.',
  }[state.status];
  const again = state.status === 'playing' ? ''
    : ` &nbsp;<a href="${issueUrl(repo, 'ttt|new', BODY)}"><b>Start a new game →</b></a>`;
  const r = state.record;
  const recent = state.recent.length
    ? `<br>Recent games: ${state.recent.map((g) => `${g.players.map((p) => `@${p}`).join(', ')} (${g.result === 'human' ? 'won' : g.result === 'ai' ? 'lost' : 'draw'})`).join(' · ')}`
    : '';

  return `<p align="center">
${rows}
</p>
<p align="center">${status}${again}</p>
<p align="center"><sub>You are <b>X</b>. The AI plays <b>O</b> with minimax: it searches every possible game before it moves, so it never loses.<br>
Each click opens a pre-filled issue. A GitHub Action plays the AI's reply and updates this board.<br>
Scoreboard: Humans <b>${r.human}</b> · AI <b>${r.ai}</b> · Draws <b>${r.draw}</b>${recent}</sub></p>`;
}
