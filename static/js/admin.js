const socket = io();

let activeClue = null;
let currentBuzzedTeam = null;
let currentWager = 0;
let multiplierMode = false;
let currentMultiplier = 1;
let dailyDoublesEnabled = true;
let currentControlTeam = null;
let finalJeopardyData = null;

/**
 * Robust helper to extract a string name from the team data.
 */
function getSafeName(team) {
    if (!team) return "Unknown";
    return typeof team === 'object' ? team.name : team;
}

/**
 * Builds the list of teams in the judging modal.
 * Separated into a function so it can be called when a clue opens
 * OR when teams update while the modal is already open.
 */
function buildTeamButtons() {
    const container = document.getElementById('team-buttons-container');
    if (!container) return;
    
    container.innerHTML = ''; 
    
    // window.teams is expected to be an array of objects or strings
    if (!window.teams || window.teams.length === 0) {
        container.innerHTML = '<p style="color:black; opacity:0.7; text-align:center;">No teams connected...</p>';
        return;
    }

    window.teams.forEach(team => {
        const displayName = getSafeName(team);
        
        const group = document.createElement('div');
        group.className = 'admin-team-group';
        group.innerHTML = `
            <button class="admin-team-btn" id="btn-${displayName}" onclick="selectTeam('${displayName}', this)">
                ${displayName}
            </button>
            <div class="manual-adjust">
                <button onclick="adjustScore('${displayName}', 100)">+100</button>
                <button onclick="adjustScore('${displayName}', -100)">-100</button>
            </div>
        `;
        container.appendChild(group);
    });

    // Re-highlight the currently buzzed team if we are rebuilding mid-clue
    if (currentBuzzedTeam) {
        const activeBtn = document.getElementById(`btn-${currentBuzzedTeam}`);
        if (activeBtn) activeBtn.classList.add('active');
    }
}

/**
 * Handles Multiplier Input for Top/Bottom rows
 */
function confirmMultiplier() {
    const multInput = document.getElementById('multiplier-input-field');
    const val = parseFloat(multInput.value);
    
    if (isNaN(val) || val <= 0) {
        alert("Please enter a valid multiplier (e.g., 2, 1.5, 5).");
        return;
    }
    
    currentMultiplier = val;

    // Swap UI
    document.getElementById('multiplier-section').classList.add('hidden');
    document.getElementById('clue-reveal-section').classList.remove('hidden');
    
    buildTeamButtons();
    
    // Tell board to reveal with multiplier
    socket.emit('admin_reveal_clue', {
        cat_idx: activeClue.catIdx,
        clue_idx: activeClue.clueIdx,
        text: activeClue.clue_text,
        multiplier: currentMultiplier
    });
}

function toggleMultiplierMode(checkbox) {
    socket.emit('toggle_multiplier_mode', { enabled: checkbox.checked });
}

/**
 * Handles Daily Double Wagers
 */
function confirmWager() {
    const wagerInput = document.getElementById('wager-input-field');
    const val = parseInt(wagerInput.value);
    
    // Jeopardy rules: Minimum wager is $5, maximum is current score or highest clue value in round
    if (isNaN(val) || val < 5) {
        alert("Please enter a valid wager (minimum $5).");
        return;
    }
    
    currentWager = val;

    // 1. Swap UI: Hide wager input, show clue text and judging buttons
    document.getElementById('wager-section').classList.add('hidden');
    document.getElementById('clue-reveal-section').classList.remove('hidden');
    
    // 2. Ensure teams are visible for judging the Daily Double
    buildTeamButtons();
    
    // 3. Tell the board to show the clue with the custom wager value
    socket.emit('admin_reveal_clue', {
        cat_idx: activeClue.catIdx,
        clue_idx: activeClue.clueIdx,
        text: activeClue.clue_text,
        is_daily_double: true,
        wager: currentWager
    });
}


/**
 * Opens the Host Modal and tells the Board to reveal the clue.
 */
function openClue(catIdx, clueIdx) {
    const cIdx = parseInt(catIdx);
    const iIdx = parseInt(clueIdx);
    const data = window.gameData;

    if (!data || !data.categories[cIdx]) return;

    const clue = data.categories[cIdx].clues[iIdx];
    activeClue = { ...clue, catIdx: cIdx, clueIdx: iIdx };
    currentWager = clue.value; // Default to face value
    currentMultiplier = 1;     // Default to no multiplier

    // Calculate how many clues in this category have already been played
    const playedInCategory = (window.played_clues || []).filter(cid => cid.startsWith(`${cIdx}-`)).length;
    const isFirstInCat = playedInCategory === 0;
    const isLastInCat = playedInCategory === (data.categories[cIdx].clues.length - 1);

    // Update Modal text
    document.getElementById('modal-category').innerText = data.categories[cIdx].category_name;
    document.getElementById('modal-value').innerText = `$${clue.value}`;
    document.getElementById('display-clue-text').innerText = clue.clue_text;
    document.getElementById('display-answer-text').innerText = clue.answer;

    // Reset local buzz state for new clue
    currentBuzzedTeam = null;

    // Open the modal
    document.getElementById('judging-modal').classList.remove('hidden');

    // DAILY DOUBLE CHECK (Assumes game_logic marks clues as daily_double: true)
    if (clue.daily_double && dailyDoublesEnabled) {
        document.getElementById('wager-section').classList.remove('hidden');
        document.getElementById('clue-reveal-section').classList.add('hidden');
        
        // Show Daily Double splash on the main board
        socket.emit('admin_reveal_clue', {
            is_daily_double: true,
            show_splash: true
        });
    } else if (multiplierMode && (isFirstInCat || isLastInCat)) {
        // Trigger multiplier entry for first or last selected clue in category
        document.getElementById('multiplier-section').classList.remove('hidden');
        document.getElementById('clue-reveal-section').classList.add('hidden');
        document.getElementById('wager-section').classList.add('hidden');

        // Show Wheel of Chaos splash on the main board
        socket.emit('admin_reveal_clue', {
            is_wheel_of_chaos: true,
            show_splash: true
        });

        setTimeout(() => document.getElementById('multiplier-input-field').focus(), 10);
    } else {
        document.getElementById('wager-section').classList.add('hidden');
        document.getElementById('multiplier-section').classList.add('hidden');
        document.getElementById('clue-reveal-section').classList.remove('hidden');
        
        // Populate teams for normal clues immediately
        buildTeamButtons();
        
        socket.emit('admin_reveal_clue', {
            cat_idx: cIdx,
            clue_idx: iIdx,
            text: clue.clue_text
        });
    }
}

function adjustScore(teamName, amount) {
    socket.emit('manual_score_adjust', { name: teamName, amount: amount });
}

/**
 * Marks which team the host is currently judging.
 */
function selectTeam(teamName, btn) {
    currentBuzzedTeam = teamName;
    
    // UI Feedback in Admin Panel
    document.querySelectorAll('.admin-team-btn').forEach(b => b.classList.remove('active'));
    // Add 'active' to the one clicked
    btn.classList.add('active');
    
    // Highlight team on the big TV Board
    socket.emit('select_team', { name: teamName });
}

/**
 * Tells the board to reveal the correct answer.
 */
function revealAnswer() {
    if (activeClue) {
        socket.emit('admin_reveal_answer', { answer: activeClue.answer });
    }
}

/**
 * Sends the Correct/Incorrect verdict to the server.
 */
function sendVerdict(isCorrect) {
    if (!currentBuzzedTeam) {
        alert("Please select which team you are judging first!");
        return;
    }

    // Use the custom wager if it was a Daily Double
    let finalValue = (activeClue.daily_double) ? currentWager : activeClue.value;
    
    if (currentMultiplier !== 1) {
        finalValue = Math.round(finalValue * currentMultiplier);
    }

    socket.emit('submit_verdict', {
        team_name: currentBuzzedTeam,
        correct: isCorrect,
        answer: activeClue.answer,
        value: finalValue,
        cat_idx: activeClue.catIdx,
        clue_idx: activeClue.clueIdx
    });

    if (isCorrect) closeModal();
}

/**
 * Closes the modal and resets local tracking.
 */
function closeModal(forceClose = false) {
    document.getElementById('judging-modal').classList.add('hidden');
    if (forceClose && activeClue) {
        socket.emit('force_close_clue', { clue_id: `${activeClue.catIdx}-${activeClue.clueIdx}` });
    }
    currentBuzzedTeam = null;
    currentWager = 0;
    currentMultiplier = 1;
}

/**
 * System Control Functions
 */
function advanceRound() {
    socket.emit('next_round');
}

function revealFinalClue() {
    if (!finalJeopardyData) return;

    // Prepare a virtual clue object for the judging logic
    activeClue = { 
        clue_text: finalJeopardyData.clue_text, 
        answer: finalJeopardyData.answer, 
        value: 0, // Set to 0 so host can use manual adjustment for custom wagers
        catIdx: 999, // Unique dummy ID
        clueIdx: 999
    };

    // Populate Modal text with Final Jeopardy info
    document.getElementById('modal-category').innerText = "FINAL JEOPARDY";
    document.getElementById('modal-value').innerText = finalJeopardyData.category;
    document.getElementById('display-clue-text').innerText = activeClue.clue_text;
    document.getElementById('display-answer-text').innerText = activeClue.answer;

    // Ensure judging sections are visible and reset state
    currentBuzzedTeam = null;
    document.getElementById('wager-section').classList.add('hidden');
    document.getElementById('multiplier-section').classList.add('hidden');
    document.getElementById('clue-reveal-section').classList.remove('hidden');

    // Open the modal and build team buttons for judging
    document.getElementById('judging-modal').classList.remove('hidden');
    buildTeamButtons();

    socket.emit('reveal_final_clue');
    document.getElementById('final-jeopardy-setup').classList.add('hidden');
}

function triggerTieBreaker() {
    socket.emit('trigger_tie_breaker');
}

function requestSync() {
    socket.emit('request_sync');
}

function confirmReset() {
    if (confirm("Are you sure? This wipes all scores and clues!")) {
        socket.emit('reset_game');
    }
}

/**
 * Updates the scores displayed in the host footer.
 */
function updateFooterScores() {
    const container = document.getElementById('admin-footer-scores');
    if (!container || !window.teams) return;

    container.innerHTML = '';
    window.teams.forEach(team => {
        const name = getSafeName(team);
        const score = (typeof team === 'object') ? team.score : 0;
        
        const pill = document.createElement('div');
        pill.className = 'footer-score-pill';
        if (name === currentControlTeam) {
            pill.classList.add('has-control');
        }

        pill.innerHTML = `<span class="team-name">${name}:</span> <span class="team-val ${score < 0 ? 'negative' : ''}">$${score}</span>`;
        container.appendChild(pill);
    });
}

/**
 * System Control Functions
 */

// Listen for Round Changes
socket.on('change_round', (data) => {
    location.reload(); 
});

socket.on('admin_final_ready', (data) => {
    finalJeopardyData = data;
    document.getElementById('next-round-btn').classList.add('hidden');
    document.getElementById('final-jeopardy-setup').classList.remove('hidden');
});

socket.on('admin_open_tie_breaker', (clue) => {
    // Prepare a "virtual" clue object for the judging logic
    activeClue = { 
        clue_text: clue.clue_text, 
        answer: clue.answer, 
        value: 0, // Usually tie-breakers don't change scores, just determine the winner
        catIdx: 99, // Dummy ID to prevent errors
        clueIdx: 99
    };

    document.getElementById('modal-category').innerText = "⚖️ TIE BREAKER";
    document.getElementById('modal-value').innerText = "SUDDEN DEATH";
    document.getElementById('display-clue-text').innerText = clue.clue_text;
    document.getElementById('display-answer-text').innerText = clue.answer;
    
    document.getElementById('judging-modal').classList.remove('hidden');
    buildTeamButtons();
});

socket.on('update_ui', (data) => {
    if (data.multiplier_mode !== undefined) {
        multiplierMode = data.multiplier_mode;
        const toggle = document.getElementById('mode-toggle-checkbox');
        if (toggle) toggle.checked = multiplierMode;
    }
    
    if (data.daily_doubles_enabled !== undefined) {
        dailyDoublesEnabled = data.daily_doubles_enabled;
    }

    if (data.control_team !== undefined) {
        currentControlTeam = data.control_team;
    }

    if (data.teams) {
        window.teams = data.teams;
        // Rebuild buttons if the judging modal is currently open
        buildTeamButtons();
        updateFooterScores();
    }

    // Dim clues that have already been played
    if (data.played_clues) {
        // Update the global tracking list so "First/Last" logic stays accurate
        window.played_clues = data.played_clues;

        data.played_clues.forEach(clueId => {
            const btn = document.getElementById(`admin-clue-${clueId}`);
            if (btn) btn.classList.add('played');
        });
    }

    // Show "Next Round" button if all clues in the current round are played
    if (data.played_clues && window.gameData && window.gameData.categories) {
        const totalClues = window.gameData.categories.length * 5;
        if (data.played_clues.length >= totalClues) {
            const nextBtn = document.getElementById('next-round-btn');
            if (nextBtn) nextBtn.classList.remove('hidden');
        }
    }

    // Handle game reset
    if (data.reset) {
        location.reload(); 
    }
});

// Request initial state sync on page load
socket.emit('request_sync');

// Initialize UI on load
updateFooterScores();