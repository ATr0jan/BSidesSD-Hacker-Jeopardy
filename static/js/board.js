const socket = io();
let timerInterval; 

/**
 * Robust helper to extract a string name from the team data.
 * This prevents the [object Object] error if the server sends the full team dictionary.
 */
function getSafeName(team) {
    if (!team) return "Unknown";
    if (typeof team === 'string') return team;
    if (typeof team === 'object' && team.name) return team.name;
    return "Unknown";
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Board initialized and connected to Socket.IO");

    // --- SOUND HELPER ---
    function playSound(filename) {
        const audio = new Audio(`/static/sounds/${filename}`);
        audio.play().catch(e => console.warn("Audio blocked by browser. Click anywhere to enable sounds."));
    }

    // --- CLUE REVEAL ---
    socket.on('admin_reveal_clue', function(data) {
        const textEl = document.getElementById('clue-text');
        const overlay = document.getElementById('clue-overlay');

        if (!textEl || !overlay) return;

        // 1. Handle Daily Double Splash Screen
        if (data.is_daily_double && data.show_splash) {
            textEl.innerHTML = `<div class="dd-splash" style="font-size: 2em; color: #ffcc00; font-weight: bold; text-shadow: 2px 2px #000;">DAILY DOUBLE</div>`;
            overlay.classList.remove('hidden');
            playSound('daily_double.mp3');
            return;
        }

        // 2. Handle Clue Reveal (Normal or DD with Wager)
        let displayText = data.text;
        if (data.is_daily_double && data.wager) {
            displayText = `<div style="font-size: 0.6em; color: #ffcc00; margin-bottom: 10px;">WAGER: $${data.wager}</div>` + data.text;
        }

        textEl.innerHTML = displayText;
        overlay.classList.remove('hidden');

        // Only start timer for normal clues (DDs usually don't have a strict timer)
        if (!data.is_daily_double) {
            const timerBar = document.getElementById('timer-bar');
            if (timerBar) {
                let timeLeft = 15;
                timerBar.style.width = '100%';
                timerBar.style.backgroundColor = '#ffcc00';

                clearInterval(timerInterval);
                timerInterval = setInterval(() => {
                    timeLeft--;
                    let percentage = (timeLeft / 15) * 100;
                    timerBar.style.width = percentage + '%';

                    if (timeLeft <= 5) timerBar.style.backgroundColor = '#ff4444';
                    if (timeLeft <= 0) {
                        clearInterval(timerInterval);
                        playSound('times_up.mp3');
                    }
                }, 1000);
            }
        } else {
            // Hide timer bar for Daily Doubles
            const timerBar = document.getElementById('timer-bar');
            if (timerBar) timerBar.style.width = '0%';
        }
    });

    // --- UI UPDATES (Scores & State) ---
    socket.on('update_ui', function(data) {
        if (data.close_clue) clearInterval(timerInterval);

        if (data.reset) {
            location.reload();
            return;
        }

        // 1. Scoreboard Management
        if (data.teams) {
            const container = document.getElementById('scoreboard-container');
            if (container) {
                container.innerHTML = '';
                data.teams.forEach(team => {
                    const cleanName = getSafeName(team);
                    const cleanScore = (typeof team === 'object' && team.score !== undefined) ? team.score : 0;

                    const card = document.createElement('div');
                    card.className = 'team-card';
                    card.id = `team-card-${cleanName}`;
                    
                    if (data.control_team === cleanName) {
                        card.classList.add('has-control');
                    }

                    card.innerHTML = `
                        <div class="team-name">${cleanName}</div>
                        <div class="team-score ${cleanScore < 0 ? 'negative-score' : ''}">$${cleanScore}</div>
                    `;
                    container.appendChild(card);
                });
            }
        }

        // 2. Close Clue Logic
        if (data.close_clue) {
            const overlay = document.getElementById('clue-overlay');
            if (overlay) overlay.classList.add('hidden');
            
            document.querySelectorAll('.team-card').forEach(c => {
                c.classList.remove('is-active', 'has-control');
            });
            
            const gridSquare = document.getElementById(`clue-${data.clue_id}`);
            if (gridSquare) gridSquare.classList.add('played');
        }

        if (data.team_who_answered) {
            if (data.was_correct) playSound('correct.mp3');
            else playSound('wrong.mp3');
        }
    });

    // --- BUZZER HIGHLIGHT ---
    socket.on('select_team', function(data) {
        const targetName = getSafeName(data.name || data);
        document.querySelectorAll('.team-card').forEach(card => card.classList.remove('is-active'));
        const activeCard = document.getElementById('team-card-' + targetName);
        if (activeCard) {
            activeCard.classList.add('is-active');
            playSound('buzzer.mp3'); 
        }
    });

    // --- ROUND TRANSITIONS ---
    socket.on('change_round', function(data) {
        document.body.innerHTML = `
            <div class="round-transition" style="display:flex; justify-content:center; align-items:center; height:100vh; background:#0000af; color:white; font-family:sans-serif;">
                <h1>${data.round_name}</h1>
            </div>`;
        playSound('double_jeopardy.mp3');
        setTimeout(() => location.reload(), 3000); 
    });

    // --- FINAL JEOPARDY ---
    socket.on('board_show_final_category', function(data) {
        const textEl = document.getElementById('clue-text');
        if (textEl) {
            textEl.innerHTML = `<div style="font-size:0.5em; text-transform:uppercase; margin-bottom:10px;">Final Jeopardy Category</div>${data.category}`;
            document.getElementById('clue-overlay').classList.remove('hidden');
            playSound('think_theme.mp3');
        }
    });

    socket.emit('request_sync');
});