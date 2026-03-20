let activeClue = null;
let currentBuzzedTeam = null;
let currentWager = 0;

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
    if (clue.daily_double) {
        document.getElementById('wager-section').classList.remove('hidden');
        document.getElementById('clue-reveal-section').classList.add('hidden');
        
        // Show Daily Double splash on the main board
        socket.emit('admin_reveal_clue', {
            is_daily_double: true,
            show_splash: true
        });
    } else {
        document.getElementById('wager-section').classList.add('hidden');
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
 * Sends the Correct/Incorrect verdict to the server.
 */
function sendVerdict(isCorrect) {
    if (!currentBuzzedTeam) {
        alert("Please select which team you are judging first!");
        return;
    }

    // Use the custom wager if it was a Daily Double
    const finalValue = (activeClue.daily_double) ? currentWager : activeClue.value;

    socket.emit('submit_verdict', {
        team_name: currentBuzzedTeam,
        correct: isCorrect,
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
}