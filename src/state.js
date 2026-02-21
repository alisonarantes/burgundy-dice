import { buildMap, mapAData, mapBData, mapCData, mapDData } from './maps.js';
import { engine } from './engine.js';

export const state = {
    selectedMap: 'A',
    phase: 1, // 1, 2, 3
    turn: 1,  // 1 to 8 (so 24 turns total)

    dice: {
        number1: null,
        number2: null,
        color1: null,
        color2: null,
        hourglass: null
    },

    diceAvailable: {
        number1: true,
        number2: true,
        color1: true,
        color2: true
    },

    placedThisTurn: 0,

    // One bonus allowed per turn (except silver which is a bonus that allows a 2nd action)
    bonusUsedThisTurn: false,
    silverUsedThisTurn: false,

    resources: {
        workers: 0,
        monks: 0,
        silver: 0,
        commodities: 0
    },

    score: 0,
    scoreEvents: [],

    map: null,

    completedColors: {
        orange: false, blue: false, green: false, yellow: false, purple: false, gray: false
    },

    // Phase 1: 10/12/14/16... Phase 2: lower, Phase 3: lower
    history: [],

    undoState: null, // Will hold the snapshot of the start of the turn

    language: 'pt', // 'en' or 'pt'
    lastScores: [], // Array of {score, date}
    messages: []
};

// Global High Score Storage separate from active game to prevent wipe on New Game
export function loadHighScores() {
    const saved = localStorage.getItem('burgundyScores');
    if (saved) {
        state.lastScores = JSON.parse(saved);
    }
}

export function saveHighScores() {
    localStorage.setItem('burgundyScores', JSON.stringify(state.lastScores));
}

export function saveState() {
    localStorage.setItem('burgundyGameState', JSON.stringify(state));
}

export function loadState() {
    const saved = localStorage.getItem('burgundyGameState');
    loadHighScores(); // Ensure scores exist
    if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(state, parsed);
        return true;
    }
    return false;
}

export function clearState() {
    localStorage.removeItem('burgundyGameState');
}

export function snapshot() {
    const copy = { ...state, undoState: null };
    state.undoState = JSON.stringify(copy);
}

export function restoreSnapshot() {
    if (state.undoState) {
        const str = state.undoState;
        const parsed = JSON.parse(str);
        Object.assign(state, parsed);
        // Deep copy diceAvailable to prevent Object.assign reference bugs
        state.diceAvailable = { ...parsed.diceAvailable };
        state.undoState = str; // preserve it so we can undo again if needed (or not, usually undo is once)
        saveState();
        return true;
    }
    return false;
}

export function initGame(mapChoice) {
    state.selectedMap = mapChoice;
    let layout = mapAData;
    if (mapChoice === 'B') layout = mapBData;
    if (mapChoice === 'C') layout = mapCData;
    if (mapChoice === 'D') layout = mapDData;

    state.map = buildMap(layout);

    state.phase = 1;
    state.turn = 1;
    state.resources = { workers: 0, monks: 0, silver: 0, commodities: 0 };
    state.score = 0;
    state.scoreEvents = [];
    state.bonusUsedThisTurn = false;
    state.silverUsedThisTurn = false;
    state.placedThisTurn = 0;
    state.startHexChosen = false;
    state.messages = [];

    state.dice = {
        number1: '?', number2: '?', color1: '?', color2: '?', hourglass: '?'
    };

    for (let c in state.completedColors) state.completedColors[c] = false;

    state.undoState = null;
    saveState();
}
