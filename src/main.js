import { state, initGame, loadState, clearState, restoreSnapshot } from './state.js';
import { engine } from './engine.js';

// DOM Elements
const screens = {
    start: document.getElementById('start-screen'),
    game: document.getElementById('game-ui')
};

const i18n = {
    en: {
        uiTitle: "The Castles of Burgundy: The Dice Game <span style='font-size: 0.8rem; color: var(--text-muted); font-weight: normal; margin-left: 10px;'>v1.26</span>",
        menu: "☰",
        historyBtn: "Scores",
        scoreLogBtn: "Match Log",
        scoreLogTitle: "Match Score Log 🏆",
        rulesBtn: "Rules",
        newgameBtn: "New Game",
        progressTitle: "Completion Progress",
        guideBtn: "Guide",
        diceTitle: "Dice Rolled",
        actionsTitle: "Actions",
        actionsHint: "Select a color die and a number die to mark a valid hex.",
        endTurnBtn: "End Turn",
        undoBtn: "Undo",
        city: "City",
        river: "River",
        castle: "Castle",
        pasture: "Pasture",
        monastery: "Monastery",
        mine: "Mine",
        invalidMove: "Invalid move - check hex color, adjacency, and specific number rules.",
        selectNumber: "You must select a Number Die first and have Worker resources.",
        selectColor: "You must select a Color Die first and have Monk resources.",
        chooseStartCastle: "Please select a Green Castle to be your starting space.",
        gameStarted: "Game started! Roll the dice and make your first move.",
        areaScoreTitle: "Area Score",
        areaScoreSize: "Size",
        areaScoreBase: "Base",
        areaScorePhase: "Phase",
        areaScoreTotal: "Total"
    },
    pt: {
        uiTitle: "The Castles of Burgundy: O Jogo de Dados <span style='font-size: 0.8rem; color: var(--text-muted); font-weight: normal; margin-left: 10px;'>v1.26</span>",
        menu: "☰",
        historyBtn: "Pontuações",
        scoreLogBtn: "Histórico da Partida",
        scoreLogTitle: "Histórico da Partida 🏆",
        rulesBtn: "Regras",
        newgameBtn: "Novo Jogo",
        progressTitle: "Progresso das Áreas",
        guideBtn: "Guia",
        diceTitle: "Dados Rolados",
        actionsTitle: "Ações",
        actionsHint: "Selecione um dado de cor e um numérico para marcar um hexágono.",
        endTurnBtn: "Passar Turno",
        undoBtn: "Desfazer",
        city: "Cidade",
        river: "Rio",
        castle: "Castelo",
        pasture: "Pastagem",
        monastery: "Mosteiro",
        mine: "Mina",
        invalidMove: "Jogada inválida - verifique a cor, vizinhança ou regra do número.",
        selectNumber: "Você precisa selecionar um Dado Numérico primeiro e possuir recursos de Worker.",
        selectColor: "Você precisa selecionar um Dado de Cor primeiro e possuir recursos de Monge.",
        chooseStartCastle: "Por favor, selecione um Castelo Verde para ser seu espaço inicial.",
        gameStarted: "Jogo iniciado! Faça sua primeira jogada.",
        areaScoreTitle: "Pontuação de Área",
        areaScoreSize: "Tam.",
        areaScoreBase: "Base",
        areaScorePhase: "Fase",
        areaScoreTotal: "Total"
    }
};

function t(key) {
    return i18n[state.language][key] || key;
}

function applyTranslations() {
    document.getElementById('ui-title').innerHTML = t('uiTitle');
    document.getElementById('txt-menu').innerText = t('menu');
    document.getElementById('txt-history-btn').innerText = t('historyBtn');
    document.getElementById('txt-score-log-btn').innerText = t('scoreLogBtn');
    if (document.getElementById('txt-score-log-title')) {
        document.getElementById('txt-score-log-title').innerText = t('scoreLogTitle');
    }
    document.getElementById('txt-rules-btn').innerText = t('rulesBtn');
    document.getElementById('txt-newgame-btn').innerText = t('newgameBtn');
    document.getElementById('txt-progress-title').innerText = t('progressTitle');
    document.getElementById('txt-guide-btn').innerText = t('guideBtn');

    const areaScoreTitle = document.getElementById('txt-area-score-title');
    if (areaScoreTitle) areaScoreTitle.innerText = t('areaScoreTitle');
    document.getElementById('txt-dice-title').innerText = t('diceTitle');
    document.getElementById('txt-actions-title').innerText = t('actionsTitle');
    document.getElementById('txt-actions-hint').innerText = t('actionsHint');
    document.getElementById('txt-end-turn-btn').innerText = t('endTurnBtn');
    document.getElementById('txt-undo-btn').innerText = t('undoBtn');

    // Rerender tracks to get color names in correct language
    if (state.map) renderSidebar();
}

// Check for existing game state
document.addEventListener('DOMContentLoaded', () => {
    if (loadState()) {
        screens.start.classList.remove('active');
        screens.game.classList.remove('hidden');
        renderAll(true);
    }
});

const mapCards = document.querySelectorAll('.map-card');
let selectedMap = null;

// Initialization
mapCards.forEach(card => {
    card.addEventListener('click', () => {
        mapCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedMap = card.dataset.map;

        // Auto-start
        setTimeout(() => {
            screens.start.classList.remove('active');
            screens.game.classList.remove('hidden');
            initGame(selectedMap);
            renderAll(true);
        }, 300); // small delay for visual feedback on click
    });
});

// Dropdown Menu Logic
document.getElementById('btn-menu').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('dropdown-menu').classList.toggle('show');
});
window.addEventListener('click', () => {
    const dropdowns = document.getElementsByClassName('dropdown-content');
    for (let i = 0; i < dropdowns.length; i++) {
        if (dropdowns[i].classList.contains('show')) {
            dropdowns[i].classList.remove('show');
        }
    }
});

// Render logic
function renderAll(forceMapRedraw = false) {
    applyTranslations();
    renderHeader();
    renderSidebar();

    // Recreate the SVG map completely only when forced
    if (forceMapRedraw) {
        renderBoard();
    } else if (state.map) {
        // Just update HTML classes for highlighting without destroying SVG
        updateMapHighlights();
    }

    // Highlight valid dice partners dynamically based on selected
    if (state.map && !state.startHexChosen) {
        document.getElementById('action-hint').innerText = t('chooseStartCastle');
        document.getElementById('action-hint').style.color = "var(--color-green)";
    } else {
        if (document.getElementById('action-hint').innerText === t('chooseStartCastle')) {
            document.getElementById('action-hint').innerText = "";
        }
        document.getElementById('action-hint').style.color = "var(--accent)";
        updatePartnerHighlights();
    }

    if (state.phase > 3) {
        let evalMessageEn = "";
        let evalMessagePt = "";
        if (state.score >= 70) {
            evalMessageEn = "Incredible!";
            evalMessagePt = "Inacreditável!";
        } else if (state.score >= 60) {
            evalMessageEn = "Excellent!";
            evalMessagePt = "Excelente!";
        } else if (state.score > 50) {
            evalMessageEn = "Well done.";
            evalMessagePt = "Muito bem.";
        }

        const msgText = state.language === 'en'
            ? `Game Over! Final Score: ${state.score}. ${evalMessageEn}`
            : `Fim de Jogo! Pontuação Final: ${state.score}. ${evalMessagePt}`;

        document.getElementById('action-hint').innerText = msgText;
        document.getElementById('action-hint').style.color = "var(--accent)";
        document.getElementById('btn-end-turn').disabled = true;
        document.getElementById('btn-undo').disabled = true;
    } else {
        document.getElementById('btn-end-turn').disabled = !state.startHexChosen;
    }
}

function updateMapHighlights() {
    const polygons = document.querySelectorAll('#board-container polygon');
    const sel = getSelectedValues();
    const canPlaceLimit = state.placedThisTurn === 0 || state.silverUsedThisTurn;

    polygons.forEach(p => {
        const hexId = parseInt(p.dataset.id);
        const hex = state.map.hexes.find(h => h.id === hexId);

        let isValid = false;
        if (sel && canPlaceLimit && hex.val === null && state.startHexChosen) {
            isValid = engine.canMark(hex, sel.num, sel.col);
        }

        if (isValid) {
            p.classList.add('valid-target');
        } else {
            p.classList.remove('valid-target');
        }
    });
}

function updatePartnerHighlights() {
    // Clear all
    ['die-n1', 'die-n2', 'die-c1', 'die-c2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('valid-partner');
    });

    const avail = state.diceAvailable;
    const canPlaceLimit = state.placedThisTurn === 0 || state.silverUsedThisTurn;
    if (!canPlaceLimit) return;

    const canUseColor = (num, col) => state.map.hexes.some(h => h.val === null && engine.canMark(h, num, col));

    if (selectedDice.num !== null && selectedDice.col === null) {
        const num = selectedDice.num === 1 ? state.dice.number1 : state.dice.number2;
        if (avail.color1 && canUseColor(num, state.dice.color1)) document.getElementById('die-c1').classList.add('valid-partner');
        if (avail.color2 && canUseColor(num, state.dice.color2)) document.getElementById('die-c2').classList.add('valid-partner');
    } else if (selectedDice.col !== null && selectedDice.num === null) {
        const col = selectedDice.col === 1 ? state.dice.color1 : state.dice.color2;
        if (avail.number1 && canUseColor(state.dice.number1, col)) document.getElementById('die-n1').classList.add('valid-partner');
        if (avail.number2 && canUseColor(state.dice.number2, col)) document.getElementById('die-n2').classList.add('valid-partner');
    }
}

function renderHeader() {
    document.getElementById('val-phase').innerText = state.phase > 3 ? 3 : state.phase;
    document.getElementById('val-turn').innerText = (state.phase > 3 ? 8 : state.turn) + ' / 8';
    document.getElementById('val-score').innerText = state.score;

    document.getElementById('val-workers').innerText = state.resources.workers;
    document.getElementById('val-monks').innerText = state.resources.monks;
    document.getElementById('val-silver').innerText = state.resources.silver;
    document.getElementById('val-commodities').innerText = state.resources.commodities;

    // Populate score history tooltip
    const tooltip = document.getElementById('score-history-tooltip');
    if (tooltip && state.scoreEvents) {
        if (state.scoreEvents.length === 0) {
            tooltip.innerHTML = '<div style="color:var(--text-muted);text-align:center;">No points yet</div>';
        } else {
            let html = '<div style="font-weight:bold;margin-bottom:5px;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:5px;">Score History</div>';
            state.scoreEvents.forEach(ev => {
                html += `<div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                    <span style="opacity:0.9">${ev.msg}</span>
                    <span style="color:#10b981;font-weight:bold;">+${ev.pts}</span>
                </div>`;
            });
            tooltip.innerHTML = html;
        }
    }
}

function showToast(htmlMessage) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'glass-panel';
    toast.style.padding = '15px 25px';
    toast.style.background = 'rgba(255, 255, 255, 0.9)';
    toast.style.color = '#102a43';
    toast.style.fontWeight = 'bold';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
    toast.style.animation = 'fadeInUp 0.3s ease-out';
    toast.innerHTML = htmlMessage;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function renderSidebar() {
    const d = state.dice;
    const avail = state.diceAvailable;

    const n1 = document.getElementById('die-n1');
    n1.innerText = d.number1;
    n1.className = `die number ${avail.number1 ? '' : 'used'} ${selectedDice.num === 1 ? 'selected' : ''}`;

    const n2 = document.getElementById('die-n2');
    n2.innerText = d.number2;
    n2.className = `die number ${avail.number2 ? '' : 'used'} ${selectedDice.num === 2 ? 'selected' : ''}`;

    const c1 = document.getElementById('die-c1');
    c1.dataset.color = d.color1;
    c1.innerText = '';
    c1.className = `die color ${avail.color1 ? '' : 'used'} ${selectedDice.col === 1 ? 'selected' : ''}`;

    const c2 = document.getElementById('die-c2');
    c2.dataset.color = d.color2;
    c2.innerText = '';
    c2.className = `die color ${avail.color2 ? '' : 'used'} ${selectedDice.col === 2 ? 'selected' : ''}`;

    document.getElementById('die-timer').innerText = d.hourglass === 2 ? '⏳⏳' : '⏳';

    // Completion tracks
    const trackContainer = document.getElementById('color-track-container');
    trackContainer.innerHTML = '';
    const colors = ['orange', 'blue', 'green', 'yellow', 'purple', 'gray'];

    colors.forEach(c => {
        const isDone = state.completedColors[c];
        const extraPointsPhase12 = { purple: 3, gray: 3, blue: 4, orange: 6, green: 3, yellow: 4 };
        const extraPointsPhase3 = { purple: 2, gray: 1, blue: 2, orange: 3, green: 1, yellow: 2 };
        let pts = state.phase === 3 ? extraPointsPhase3[c] : extraPointsPhase12[c];

        // Map colors to i18n keys
        const cMap = { orange: 'city', blue: 'river', green: 'castle', yellow: 'pasture', purple: 'monastery', gray: 'mine' };

        const div = document.createElement('div');
        div.className = `track-item ${isDone ? 'done' : ''}`;
        div.innerHTML = `<span style="color:var(--color-${c});font-weight:bold;">${t(cMap[c])}</span> <span>${pts}</span>`;
        trackContainer.appendChild(div);
    });

    // Area Score Table
    const areaScoreContainer = document.getElementById('area-score-container');
    if (areaScoreContainer) {
        let tableHtml = `
        <table style="width: 100%; border-collapse: collapse; text-align: center;">
            <thead>
                <tr style="border-bottom: 1px solid var(--glass-border);">
                    <th style="padding: 4px;">${t('areaScoreSize')}</th>
                    <th style="padding: 4px;">${t('areaScoreTotal')}</th>
                </tr>
            </thead>
            <tbody>
        `;
        const scoreTable = {
            1: [1, 1, 1],
            2: [4, 3, 2],
            3: [8, 6, 4],
            4: [13, 10, 7]
        };
        for (let i = 1; i <= 4; i++) {
            let total = scoreTable[i][state.phase - 1] || 0;
            tableHtml += `
            <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                <td style="padding: 4px;">${i}</td>
                <td style="padding: 4px; font-weight: bold; color: var(--color-green);">${total}</td>
            </tr>
            `;
        }
        tableHtml += `</tbody></table>`;
        areaScoreContainer.innerHTML = tableHtml;
    }

    // Update Undo Button state
    document.getElementById('btn-undo').disabled = !state.undoState;
}

// Interaction state
let selectedDice = { num: null, col: null };

function updateColorHint(color) {
    const hintEl = document.getElementById('action-hint');
    if (!color) {
        hintEl.innerText = "";
        return;
    }
    const hintsEn = {
        'orange': 'City (Orange): Needs different numbers in the same area.',
        'blue': 'River (Blue): Must be 5 or 6.',
        'green': 'Castle (Green): Must match a number of any marked neighbor.',
        'yellow': 'Pasture (Yellow): Needs identical numbers in the same area.',
        'purple': 'Monastery (Purple): Must be 1 or 2.',
        'gray': 'Mine (Gray): Must be 3 or 4.'
    };
    const hintsPt = {
        'orange': 'Cidade (Laranja): Hexágonos adjacentes precisam ter números diferentes na mesma área.',
        'blue': 'Rio (Azul): O dado deve ser obrigatoriamente 5 ou 6.',
        'green': 'Castelo (Verde): Deve ter exatamente o mesmo valor numérico de um vizinho já preenchido.',
        'yellow': 'Pastagem (Amarelo): Hexágonos na mesma área devem ter o mesmíssimo número de dado.',
        'purple': 'Mosteiro (Roxo): O dado deve ser obrigatoriamente 1 ou 2.',
        'gray': 'Mina (Cinza): O dado deve ser obrigatoriamente 3 ou 4.'
    };

    if (state.language === 'en') hintEl.innerText = hintsEn[color] || "";
    if (state.language === 'pt') hintEl.innerText = hintsPt[color] || "";
}

document.getElementById('die-n1').addEventListener('click', () => {
    if (state.diceAvailable.number1) { selectedDice.num = 1; renderAll(); }
});
document.getElementById('die-n2').addEventListener('click', () => {
    if (state.diceAvailable.number2) { selectedDice.num = 2; renderAll(); }
});
document.getElementById('die-c1').addEventListener('click', () => {
    if (state.diceAvailable.color1) {
        selectedDice.col = 1;
        updateColorHint(state.dice.color1);
        renderAll();
    }
});
document.getElementById('die-c2').addEventListener('click', () => {
    if (state.diceAvailable.color2) {
        selectedDice.col = 2;
        updateColorHint(state.dice.color2);
        renderAll();
    }
});

function getSelectedValues() {
    if (!selectedDice.num || !selectedDice.col) return null;
    const num = selectedDice.num === 1 ? state.dice.number1 : state.dice.number2;
    const col = selectedDice.col === 1 ? state.dice.color1 : state.dice.color2;
    return { num, col };
}

// SVG Drawing
function renderBoard() {
    const container = document.getElementById('board-container');

    // Calculate bounding box and viewBox
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    const SIZE = 50;
    const w = Math.sqrt(3) * SIZE;
    const h = 2 * SIZE;

    // To place scores, find a centerish tile for each color
    let colorCenters = {};

    state.map.hexes.forEach(hex => {
        const x = w * (hex.q + hex.r / 2);
        const y = h * 0.75 * hex.r;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;

        if (!colorCenters[hex.color]) colorCenters[hex.color] = { x: 0, y: 0, count: 0 };
        colorCenters[hex.color].x += x;
        colorCenters[hex.color].y += y;
        colorCenters[hex.color].count++;
    });

    Object.keys(colorCenters).forEach(c => {
        colorCenters[c].x /= colorCenters[c].count;
        colorCenters[c].y /= colorCenters[c].count;
    });

    const vbMinX = minX - w;
    const vbMinY = minY - h;
    const vbWidth = (maxX - minX) + 2 * w;
    const vbHeight = (maxY - minY) + 2 * h;

    let svg = `<svg viewBox="${vbMinX} ${vbMinY} ${vbWidth} ${vbHeight}" xmlns="http://www.w3.org/2000/svg">`;

    // Draw hexes
    state.map.hexes.forEach(hex => {
        const cx = w * (hex.q + hex.r / 2);
        const cy = h * 0.75 * hex.r;

        // Polygon points for pointy top:
        let points = [];
        for (let i = 0; i < 6; i++) {
            let angle_deg = 60 * i - 30;
            let angle_rad = Math.PI / 180 * angle_deg;
            points.push(`${cx + SIZE * Math.cos(angle_rad)},${cy + SIZE * Math.sin(angle_rad)}`);
        }

        // Check if targetable for visual feedback
        const sel = getSelectedValues();
        let isValid = false;
        const canPlaceLimit = state.placedThisTurn === 0 || state.silverUsedThisTurn;

        if (sel && canPlaceLimit) {
            isValid = engine.canMark(hex, sel.num, sel.col);
        }

        const classNames = `hex hex-${hex.color} ${isValid ? 'valid-target' : ''}`;

        svg += `<polygon points="${points.join(' ')}" class="${classNames}" 
              data-id="${hex.id}" 
              stroke="#222"/>`;

        if (hex.val !== null) {
            const textColor = hex.color === 'yellow' ? 'black' : 'white';
            const label = hex.val === '*' ? '★' : hex.val;
            svg += `<text x="${cx}" y="${cy}" class="hex-text" fill="${textColor}">${label}</text>`;
        }

        // Small icon for castles
        if (hex.color === 'green' && hex.castleBonus && hex.val === null) {
            const symbolsMap = { monk: '✝', worker: '⚒', silver: '🪙', commodity: '📦', purple: '✝', orange: '⚒', gray: '🪙', blue: '📦' };
            const symbol = symbolsMap[hex.castleBonus] || '?';
            const colorsMap = { monk: 'purple', worker: 'orange', silver: 'gray', commodity: 'blue' };
            const iconColor = colorsMap[hex.castleBonus] || hex.castleBonus;

            // Draw a subtle border circle and text symbol
            svg += `<circle cx="${cx}" cy="${cy + 12}" r="14" fill="var(--color-${iconColor})" stroke="white" stroke-width="2" />`;
            svg += `<text x="${cx}" y="${cy + 12}" font-size="18px" fill="white" font-weight="bold" text-anchor="middle" dominant-baseline="central">${symbol}</text>`;
        }

        // Draw area borders slightly bolder? (Omitted for simplicity, rely on colors)
    });

    // Draw the overall color completion bonus VP somewhere visually appropriate
    // We already calculated the avg center per color. Let's just draw the score there, offset slightly if needed
    const extraPointsPhase12 = { purple: 3, gray: 3, blue: 4, orange: 6, green: 3, yellow: 4 };
    const extraPointsPhase3 = { purple: 2, gray: 1, blue: 2, orange: 3, green: 1, yellow: 2 };

    Object.keys(colorCenters).forEach(c => {
        if (state.completedColors[c]) return; // Don't draw if already claimed
        // find a hex of this color that is closest to the avg center so it sits on a tile
        let bestHex = null;
        let bestDist = Infinity;
        state.map.hexes.filter(h => h.color === c).forEach(h => {
            const cx = w * (h.q + h.r / 2);
            const cy = h * 0.75 * h.r;
            const dist = Math.pow(cx - colorCenters[c].x, 2) + Math.pow(cy - colorCenters[c].y, 2);
            if (dist < bestDist) {
                bestDist = dist;
                bestHex = { x: cx, y: cy };
            }
        });

        if (bestHex) {
            const p12 = extraPointsPhase12[c];
            const p3 = extraPointsPhase3[c];
            const bonusText = `+${p12} | +${p3}`;
            // Add a subtle dark background pill for the text to pop out on any color
            svg += `<rect x="${bestHex.x - 35}" y="${bestHex.y - 36}" width="70" height="22" rx="10" fill="black" opacity="0.6" style="pointer-events:none;"/>`;
            svg += `<text x="${bestHex.x}" y="${bestHex.y - 25}" font-size="14px" fill="#ffeb3b" font-weight="bold" text-anchor="middle" dominant-baseline="central" style="pointer-events:none; text-shadow: 1px 1px 2px black;">${bonusText}</text>`;
        }
    });

    svg += `</svg>`;
    container.innerHTML = svg;

    // Add event listeners to hexes
    const polygons = container.querySelectorAll('polygon');
    polygons.forEach(p => {
        p.addEventListener('click', () => {
            const hexId = parseInt(p.dataset.id);
            const hex = state.map.hexes.find(h => h.id === hexId);

            if (!state.startHexChosen) {
                if (hex.color === 'green' && hex.val === null) {
                    engine.markHex(hex, null, null, null, true);
                    state.startHexChosen = true;
                    engine.rollDice();
                    renderAll(true);
                    showToast(t('gameStarted'));
                } else {
                    alert(t('chooseStartCastle'));
                }
                return;
            }

            const sel = getSelectedValues();
            if (!sel) {
                alert(state.language === 'en' ? "Select exactly one number die and one color die first!" : "Selecione exatamente um dado de cor e um de número primeiro!");
                return;
            }

            const canPlaceLimit = state.placedThisTurn === 0 || state.silverUsedThisTurn;

            if (canPlaceLimit && engine.canMark(hex, sel.num, sel.col)) {
                // Mark it and consume dice synchronously
                engine.markHex(hex, sel.num, selectedDice.num, selectedDice.col);

                selectedDice = { num: null, col: null };
                updateColorHint(null);
                renderAll(true);

                if (state.messages && state.messages.length > 0) {
                    showToast(state.messages.join('<br>'));
                }
            } else {
                alert(t('invalidMove'));
            }
        });
    });
}

// Side Actions / End Turn / Game Management
document.getElementById('btn-end-turn').addEventListener('click', () => {
    if (!state.startHexChosen) {
        alert(t('chooseStartCastle'));
        return;
    }

    if (engine.hasValidMoves()) {
        if (!confirm(state.language === 'en' ? "You still have valid moves. Are you sure you want to pass and gain 1 Worker?" : "Você ainda tem jogadas possíveis. Tem certeza que deseja encerrar o turno (e ganhar 1 Trabalhador)?")) {
            return;
        }
    }

    // Force blur to remove focus from the button so right click works properly
    document.getElementById('btn-end-turn').blur();

    state.messages = [];
    engine.endTurn();

    if (state.messages && state.messages.length > 0) {
        showToast(state.messages.join('<br>'));
    }

    selectedDice = { num: null, col: null };
    updateColorHint(null);
    renderAll(true); // new turn, new dice, potential area scoring highlights? better safe
});

// Add right click
document.addEventListener('contextmenu', (e) => {
    // Only intercept if we are in active game state
    if (!screens.game.classList.contains('hidden') && state.startHexChosen) {
        // Only if clicking on the document body or main container, avoid blocking actual context menus on inputs if any
        e.preventDefault();
        document.getElementById('btn-end-turn').click();
    }
});

document.getElementById('btn-undo').addEventListener('click', () => {
    if (restoreSnapshot()) {
        selectedDice = { num: null, col: null };
        updateColorHint(null);
        renderAll(true);
    }
});

// Resource Powers Logic: Worker & Monk
document.getElementById('btn-worker').addEventListener('click', () => {
    if (state.resources.workers > 0) {
        document.getElementById('modal-worker').classList.remove('hidden');
        document.getElementById('modal-worker').classList.add('active');

        let p1 = state.diceAvailable.number1;
        let p2 = state.diceAvailable.number2;

        document.getElementById('btn-w-n1').disabled = !p1;
        document.getElementById('btn-w-n2').disabled = !p2;

        let btn1 = document.getElementById('btn-w-n1');
        let btn2 = document.getElementById('btn-w-n2');

        document.querySelector('#modal-worker h3').innerText = state.language === 'en' ? 'Use Worker ⚒' : 'Usar Trabalhador ⚒';
        document.getElementById('txt-worker-desc').innerText = state.language === 'en' ? 'Change a number die to ANY value:' : 'Altere o número do dado para QUALQUER valor:';
        document.getElementById('txt-worker-pick').innerText = state.language === 'en' ? 'Choose the new number:' : 'Escolha o novo número:';

        btn1.innerText = p1 ? (state.language === 'en' ? `Die 1 (${state.dice.number1})` : `Dado 1 (${state.dice.number1})`) : (state.language === 'en' ? 'Die 1 (Used)' : 'Dado 1 (Usado)');
        btn2.innerText = p2 ? (state.language === 'en' ? `Die 2 (${state.dice.number2})` : `Dado 2 (${state.dice.number2})`) : (state.language === 'en' ? 'Die 2 (Used)' : 'Dado 2 (Usado)');

        document.getElementById('worker-numbers').classList.add('hidden');
        window._workerSelectedNumIdx = null;
        document.querySelectorAll('.val-btn').forEach(b => b.style.border = '2px solid transparent');
    } else {
        showToast(state.language === 'en' ? "You don't have enough Worker resources." : "Você não possui recursos de Trabalhador.");
    }
});

['btn-w-n1', 'btn-w-n2'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
        window._workerSelectedNumIdx = id.includes('n1') ? 1 : 2;
        document.getElementById('worker-numbers').classList.remove('hidden');
    });
});

document.querySelectorAll('.val-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (!window._workerSelectedNumIdx) return alert(state.language === 'en' ? "Select a die first!" : "Selecione um dado primeiro!");
        e.target.style.border = '2px solid var(--accent)';
        const desiredNumber = parseInt(e.target.dataset.val);

        if (engine.useWorker(window._workerSelectedNumIdx, desiredNumber)) {
            setTimeout(() => {
                document.getElementById('modal-worker').classList.remove('active');
                setTimeout(() => document.getElementById('modal-worker').classList.add('hidden'), 300);
                renderAll();
            }, 100);
        }
    });
});

document.getElementById('btn-monk').addEventListener('click', () => {
    if (state.resources.monks > 0) {
        document.getElementById('modal-monk').classList.remove('hidden');
        document.getElementById('modal-monk').classList.add('active');
        document.getElementById('btn-m-c1').disabled = !state.diceAvailable.color1;
        document.getElementById('btn-m-c2').disabled = !state.diceAvailable.color2;

        // Show current color dice in the buttons if available
        let btn1 = document.getElementById('btn-m-c1');
        let btn2 = document.getElementById('btn-m-c2');

        btn1.innerText = state.diceAvailable.color1 ? `Color 1 (${t(state.dice.color1) || state.dice.color1})` : 'Color 1 (Used)';
        btn2.innerText = state.diceAvailable.color2 ? `Color 2 (${t(state.dice.color2) || state.dice.color2})` : 'Color 2 (Used)';

        window._monkSelectedColor = null;
        document.querySelectorAll('#monk-colors .c-swatch').forEach(s => s.style.border = '2px solid transparent');
    } else {
        showToast(state.language === 'en' ? "You don't have enough Monk resources." : "Você não possui recursos de Monge.");
    }
});


document.querySelectorAll('#monk-colors .c-swatch').forEach(el => {
    el.addEventListener('click', (e) => {
        document.querySelectorAll('#monk-colors .c-swatch').forEach(s => s.style.border = '2px solid transparent');
        e.target.style.border = '2px solid var(--accent)';
        window._monkSelectedColor = e.target.dataset.c;
    });
});

['btn-m-c1', 'btn-m-c2'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
        if (!window._monkSelectedColor) return alert("Select a color first!");
        const targetColIdx = id.includes('c1') ? 1 : 2;
        if (engine.useMonk(targetColIdx, window._monkSelectedColor)) {
            document.getElementById('modal-monk').classList.remove('active');
            setTimeout(() => document.getElementById('modal-monk').classList.add('hidden'), 300);
            const newCol = window._monkSelectedColor;
            updateColorHint(newCol);
            renderAll();
        }
    });
});

document.getElementById('btn-new-game').addEventListener('click', () => {
    if (confirm("Are you sure you want to abandon the current game?")) {
        clearState();
        screens.game.classList.add('hidden');
        screens.start.classList.add('active');
        // Unselect map cards
        mapCards.forEach(c => c.classList.remove('selected'));
        btnStart.disabled = true;
        selectedMap = null;
    }
});

document.getElementById('btn-rules').addEventListener('click', () => {
    document.getElementById('modal-rules').classList.remove('hidden');
    document.getElementById('modal-rules').classList.add('active');
});

document.getElementById('btn-lang-toggle').addEventListener('click', () => {
    state.language = state.language === 'pt' ? 'en' : 'pt';
    renderAll();
});

document.getElementById('btn-history').addEventListener('click', () => {
    const modal = document.getElementById('modal-history');
    const content = document.getElementById('history-list');
    content.innerHTML = '';

    if (!state.lastScores || state.lastScores.length === 0) {
        content.innerHTML = `<p>${state.language === 'en' ? 'No scores yet!' : 'Nenhuma pontuação registrada.'}</p>`;
    } else {
        const sorted = [...state.lastScores].sort((a, b) => b.score - a.score);
        sorted.forEach((s, idx) => {
            content.innerHTML += `<div style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #ccc;">
                <strong>#${idx + 1}</strong> <span>${s.score} VP (Map ${s.map || '?'})</span> <span><small>${s.date}</small></span>
            </div>`;
        });
    }
    modal.classList.remove('hidden');
    modal.classList.add('active');
});

document.getElementById('btn-score-log').addEventListener('click', () => {
    const modal = document.getElementById('modal-score-log');
    const content = document.getElementById('score-log-list');
    content.innerHTML = '';

    if (!state.scoreEvents || state.scoreEvents.length === 0) {
        content.innerHTML = `<p>${state.language === 'en' ? 'No points earned yet!' : 'Nenhum ponto marcado ainda.'}</p>`;
    } else {
        state.scoreEvents.forEach((ev, idx) => {
            content.innerHTML += `<div style="display:flex; justify-content:space-between; margin-bottom: 8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">
                <span style="opacity:0.9">${ev.msg}</span>
                <span style="color:#10b981;font-weight:bold;">+${ev.pts}</span>
            </div>`;
        });
    }
    modal.classList.remove('hidden');
    modal.classList.add('active');
});

// Modals Setup
let pendingModals = {};

document.getElementById('btn-commodity').addEventListener('click', () => {
    if (state.dice.hourglass === 2 && state.resources.commodities > 0) {
        engine.sellCommodities();
        renderAll();
    } else {
        showToast(state.language === 'en' ? "You need a double hourglass rolled and commodities to sell." : "Você precisa que as ampulhetas sejam duplas para vender mercadorias.");
    }
});

document.getElementById('btn-silver').addEventListener('click', () => {
    if (state.resources.silver > 0 && !state.silverUsedThisTurn) {
        if (engine.useSilver()) {
            showToast(state.language === 'en' ? "Silver used. You may place the remaining dice." : "Prata utilizada. Você pode colocar os dados restantes.");
            renderAll();
        }
    } else {
        showToast(state.language === 'en' ? "You cannot use Silver right now." : "Você não pode usar Prata neste momento.");
    }
});

// Expose state and engine for debugging
window.game = { state, engine, renderAll };
