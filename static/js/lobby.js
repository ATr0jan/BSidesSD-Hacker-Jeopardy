/* BSidesSD Hacker Jeopardy - A full Web App with Admin Panel and Viewerboards.
*
* Copyright (C) 2026 Atr0jan <ATr0j4n@Gmail.com>
* SPDX-License-Identifier: GPL-3.0-or-later
*/

document.addEventListener('DOMContentLoaded', () => {
    const socket = io(); 

    const inputList = document.getElementById('team-input-list');
    const addBtn = document.getElementById('add-team-btn');
    const startBtn = document.getElementById('start-game-btn');

    // 1. Logic to add a new team input field
    addBtn.addEventListener('click', () => {
        const teamCount = document.querySelectorAll('.team-name-input').length + 1;
        
        const div = document.createElement('div');
        div.className = 'team-input-group';
        div.innerHTML = `
            <input type="text" class="team-name-input" placeholder="Team ${teamCount} Name">
            <button type="button" class="remove-team-btn" onclick="this.parentElement.remove()">×</button>
        `;
        inputList.appendChild(div);
    });

    // 2. Logic to collect names and start the game
    startBtn.addEventListener('click', () => {
        const inputs = document.querySelectorAll('.team-name-input');
        const teamNames = []; 

        // Capture the selected game mode
        const modeToggle = document.getElementById('multiplier-mode-checkbox');
        const isMultiplierMode = modeToggle ? modeToggle.checked : false;

        const ddToggle = document.getElementById('daily-double-checkbox');
        const isDailyDoubleEnabled = ddToggle ? ddToggle.checked : true;

        inputs.forEach(input => {
            const name = input.value.trim();
            if (name !== "") {
                // SEND STRINGS ONLY. Let app.py/game_logic.py handle the object creation.
                teamNames.push(name); 
            }
        });

        if (teamNames.length < 2) {
            // Using a basic console log/notification instead of alert is better for some environments,
            // but alert works fine for standard browser testing.
            alert("You need at least 2 teams to play!");
            return;
        }

        // Feature: Enable Event Logging 
        // We can pass this flag to the server to track the session for post-event posting
        const sessionMetadata = {
            timestamp: new Date().toISOString(),
            event_mode: true
        };

        // Send strings and metadata to the server
        socket.emit('initialize_game', { 
            teams: teamNames,
            metadata: sessionMetadata,
            multiplier_mode: isMultiplierMode,
            daily_doubles_enabled: isDailyDoubleEnabled
         });
    });

    // 3. Listen for the redirect signal from the server
    socket.on('redirect_to_board', () => {
        window.location.href = "/admin"; 
    });
});