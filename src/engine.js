import { state, saveState, snapshot } from './state.js';

export const engine = {
    rollDice() {
        state.dice.number1 = Math.floor(Math.random() * 6) + 1;
        state.dice.number2 = Math.floor(Math.random() * 6) + 1;

        const colors = ['orange', 'blue', 'green', 'yellow', 'purple', 'gray'];
        state.dice.color1 = colors[Math.floor(Math.random() * 6)];
        state.dice.color2 = colors[Math.floor(Math.random() * 6)];

        // Hourglass logic
        let hourglassOptions = [1, 1, 1, 1, 2, 2]; // mostly single, some double
        state.dice.hourglass = hourglassOptions[Math.floor(Math.random() * hourglassOptions.length)];

        state.diceAvailable = { number1: true, number2: true, color1: true, color2: true };
        state.bonusUsedThisTurn = false;
        state.workerUsedThisTurn = false;
        state.monkUsedThisTurn = false;
        state.silverUsedThisTurn = false;
        state.placedThisTurn = 0;

        // Check if phase advances (timer fills up)
        state.history.push({ ...state.dice });

        // Clear undo snapshot so you can't undo into a prior turn
        state.undoState = null;

        // Auto-save at start of new roll
        saveState();
    },

    sellCommodities() {
        snapshot();
        const c = state.resources.commodities;
        state.resources.silver += c;
        const pts = c * 2;
        state.score += pts;
        if (pts > 0) state.scoreEvents.unshift({ msg: `Sold ${c} Commodities`, pts });
        state.resources.commodities = 0;
        saveState();
    },

    useMonk(targetColorIdx, desiredColor) {
        if (state.resources.monks <= 0 || state.bonusUsedThisTurn) return false;
        snapshot();
        state.resources.monks--;
        if (targetColorIdx === 1) state.dice.color1 = desiredColor;
        if (targetColorIdx === 2) state.dice.color2 = desiredColor;
        state.monkUsedThisTurn = true;
        state.bonusUsedThisTurn = true;
        saveState();
        return true;
    },

    useWorker(targetNumIdx, desiredNumber) {
        if (state.resources.workers <= 0 || state.bonusUsedThisTurn) return false;
        snapshot();
        state.resources.workers--;
        if (targetNumIdx === 1) state.dice.number1 = desiredNumber;
        if (targetNumIdx === 2) state.dice.number2 = desiredNumber;
        state.workerUsedThisTurn = true;
        state.bonusUsedThisTurn = true;
        saveState();
        return true;
    },

    useSilver() {
        if (state.resources.silver <= 0 || state.bonusUsedThisTurn) return false;
        snapshot();
        state.resources.silver--;
        state.silverUsedThisTurn = true;
        state.bonusUsedThisTurn = true;
        saveState();
        // UI needs to allow picking the unused dice combination
        return true;
    },

    canMark(hex, num, color) {
        if (hex.val !== null) return false;

        // Color must match
        if (hex.color !== color) return false;

        // Adjacency check (must have a marked neighbor)
        const hasMarkedNeighbor = hex.neighbors.some(nId => {
            return state.map.hexes[nId].val !== null;
        });
        // Start castle is technically free (but we init it)
        if (!hasMarkedNeighbor && !hex.isStart) return false;

        // Number rules
        if (hex.color === 'gray') { // Mine
            if (num !== 3 && num !== 4) return false;
        }
        else if (hex.color === 'blue') { // River
            if (num !== 5 && num !== 6) return false;
        }
        else if (hex.color === 'purple') { // Monastery
            if (num !== 1 && num !== 2) return false;
        }
        else if (hex.color === 'green') { // Castle
            // must equal a marked neighbor's value
            const valid = hex.neighbors.some(nId => {
                const n = state.map.hexes[nId];
                return n.val === num;
            });
            if (!valid) return false;
        }
        else if (hex.color === 'yellow') { // Pasture
            // all identical in the area
            const areaHexes = state.map.hexes.filter(h => h.areaId === hex.areaId && h.val !== null);
            if (areaHexes.length > 0 && areaHexes[0].val !== num) return false;
        }
        else if (hex.color === 'orange') { // City
            // all different in the area
            const areaHexes = state.map.hexes.filter(h => h.areaId === hex.areaId && h.val !== null);
            if (areaHexes.some(h => h.val === num)) return false;
        }

        return true;
    },

    markHex(hex, num, usedNumIdx = null, usedColIdx = null, init = false) {
        if (!init) {
            snapshot();
            state.placedThisTurn++;
            state.messages = []; // Clear per action

            if (usedNumIdx === 1) state.diceAvailable.number1 = false;
            else if (usedNumIdx === 2) state.diceAvailable.number2 = false;

            if (usedColIdx === 1) state.diceAvailable.color1 = false;
            else if (usedColIdx === 2) state.diceAvailable.color2 = false;
        }

        hex.val = init ? '*' : num;

        // Check if area completed
        const areaHexes = state.map.hexes.filter(h => h.areaId === hex.areaId);

        const completed = areaHexes.every(h => h.val !== null);

        if (completed && !init) {
            this.awardAreaBonus(hex, areaHexes.length);
        }

        if (hex.color === 'green') {
            // Award castle bonus instantly
            const iconToName = { 'monk': '✝ Monk', 'worker': '⚒ Worker', 'silver': '🪙 Silver', 'commodity': '📦 Commodity', 'purple': '✝ Monk', 'orange': '⚒ Worker', 'gray': '🪙 Silver', 'blue': '📦 Commodity' };
            const won = iconToName[hex.castleBonus] || hex.castleBonus;

            if (hex.castleBonus === 'monk' || hex.castleBonus === 'purple') state.resources.monks++;
            else if (hex.castleBonus === 'worker' || hex.castleBonus === 'orange') state.resources.workers++;
            else if (hex.castleBonus === 'silver' || hex.castleBonus === 'gray') state.resources.silver++;
            else if (hex.castleBonus === 'commodity' || hex.castleBonus === 'blue') state.resources.commodities++;

            if (!init) {
                state.score += 1;
                state.scoreEvents.unshift({ msg: `Castle Bonus (${won})`, pts: 1 });
                state.messages.push(`🏰 Castle Bonus: +1 VP & +1 ${won}`);
            } else {
                state.messages.push(`🏰 Starting Castle Bonus: +1 ${won}`);
            }
        }

        // Check if all of color completed
        const colorHexes = state.map.hexes.filter(h => h.color === hex.color);
        const colorCompleted = colorHexes.every(h => h.val !== null);

        if (colorCompleted && !state.completedColors[hex.color] && !init) {
            state.completedColors[hex.color] = true;
            // Solo variant extra points
            const extraPointsPhase12 = { purple: 3, gray: 3, blue: 4, orange: 6, green: 3, yellow: 4 };
            const extraPointsPhase3 = { purple: 2, gray: 1, blue: 2, orange: 3, green: 1, yellow: 2 };
            let pts = state.phase === 3 ? extraPointsPhase3[hex.color] : extraPointsPhase12[hex.color];
            pts = pts || 0;
            state.score += pts;
            state.scoreEvents.unshift({ msg: `Completed ${hex.color} hexes`, pts });
            state.messages.push(`🏆 All ${hex.color} Hexes Completed! +${pts} VP`);
        }

        if (!init) {
            saveState();
        }
    },

    awardAreaBonus(hex, size) {
        const scoreTable = {
            1: [1, 1, 1],
            2: [4, 3, 2],
            3: [8, 6, 4],
            4: [13, 10, 7]
        };

        const ptsRow = scoreTable[size] || [0, 0, 0];
        let totalPts = ptsRow[state.phase - 1] || 0;

        if (hex.color === 'yellow') {
            totalPts *= 2; // Pastures double area VP!
        }

        state.score += totalPts;
        let msgShort = hex.color === 'yellow' ? `Pasture Area size ${size}` : `Area size ${size}`;
        state.scoreEvents.unshift({ msg: msgShort, pts: totalPts });

        let msg = `✨ Area Completed! Size ${size} grants +${totalPts} VP.`;
        if (hex.color === 'yellow') msg = `✨ Pasture Area Completed! Size ${size} grants double VP (+${totalPts} VP).`;

        state.messages.push(msg);

        if (hex.color === 'purple') {
            state.resources.monks++;
            state.messages.push(`✝ Monastery Bonus: +1 Monk`);
        } else if (hex.color === 'blue') {
            state.resources.commodities++;
            state.messages.push(`📦 River Bonus: +1 Commodity`);
        } else if (hex.color === 'orange') {
            state.resources.workers++;
            state.messages.push(`⚒ City Bonus: +1 Worker`);
        }

        // Area Completion specific bonuses were moved up to markHex so they trigger on init too
    },

    hasValidMoves() {
        // Find all available numbers and colors
        let availableNums = [];
        if (state.diceAvailable.number1) availableNums.push(state.dice.number1);
        if (state.diceAvailable.number2) availableNums.push(state.dice.number2);

        let availableCols = [];
        if (state.diceAvailable.color1) availableCols.push(state.dice.color1);
        if (state.diceAvailable.color2) availableCols.push(state.dice.color2);

        // If no pairs can be formed, return false
        if (availableNums.length === 0 || availableCols.length === 0) return false;

        const canPlaceLimit = state.placedThisTurn === 0 || state.silverUsedThisTurn;
        if (!canPlaceLimit) return false;

        // Try every available num / color against all empty hexes
        for (let num of availableNums) {
            for (let col of availableCols) {
                for (let hex of state.map.hexes) {
                    if (hex.val === null && this.canMark(hex, num, col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    },

    endTurn() {
        if (state.phase > 3) return; // Game already over

        if (state.placedThisTurn === 0) {
            state.resources.workers++;
            if (!state.messages) state.messages = [];
            state.messages.push("⏳ Turno Passado: +1 Trabalhador ⚒");
        }

        state.turn++;
        if (state.turn > 8) {
            state.turn = 1;
            state.phase++;
        }
        if (state.phase > 3) {
            import('./state.js').then(module => {
                state.lastScores.unshift({ score: state.score, date: new Date().toLocaleString(), map: state.selectedMap });
                if (state.lastScores.length > 10) state.lastScores.pop();
                module.saveHighScores();
                saveState(); // Ensure the final state is written
                if (!state.messages) state.messages = [];
                state.messages.push(`🏁 O jogo acabou! Sua pontuação final foi: ${state.score} VP`);
            });
        } else {
            this.rollDice();
        }
    }
};
