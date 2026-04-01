# Quick-Start Guide

Follow these steps in order, and you’ll have a fully functional Jeopardy game running on your network.

---

### 1. Installation & Environment

Open your terminal or command prompt and run the following to install the necessary Python libraries:

```bash
pip install flask flask-socketio
```

---

### 2. Project Execution Order

To launch the game successfully, follow this specific sequence:

1. **Start the Server:**
Run `python app.py`. You should see a message saying `Listening on http://0.0.0.0:5000`.
2. **Open the Board (TV Screen):**
Navigate to `http://localhost:5000/board`. This is the screen you should drag to your TV or secondary monitor.
3. **Open the Lobby (Setup):**
Navigate to `http://localhost:5000/` on your main computer.
* Add your team names.
* **Game Modes:** Toggle "Wheel of Chaos" (Multipliers on the first and last clues of each category) or "Daily Doubles."
* Click **"LAUNCH GAME"**.

4. **The Admin Shift:**
The Lobby will automatically redirect you to `http://localhost:5000/admin`. Keep this on your laptop or tablet—this is your private control panel.

---

### 3. Special Mechanics
* **Wheel of Chaos:** When enabled, the first clue and the last clue selected in any category will prompt the host for a multiplier. Spin your physical peg wheel and enter the result!
* **Control Team:** The team that last answered correctly has "Control." They are highlighted with a **Thick Yellow Border** on the board as a reminder of who picks next.

---

### 3. Gameplay Flow (The "Host" Routine)

Once the game is live, your workflow as the host looks like this:

| Action | Admin Interaction | Result on Board (TV) |
| --- | --- | --- |
| **Pick Clue** | Click a dollar amount on your grid. | Grid disappears; Clue text appears. |
| **Multiplier** | If prompted, enter the Wheel Spin result. | Multiplier is displayed at the top of the clue. |
| **Buzzer** | Listen for the sound, then click the Team Name in your popup. | That team’s score card glows/pops out. |
| **Reveal Answer**| Click **REVEAL ANSWER**. | The correct answer is shown to the audience. |
| **Judge** | Click **CORRECT (+)** or **INCORRECT (-)**. | Score updates; Board plays sound; Clue closes. |
| **Stumped** | Click **"No One Got It"** if no one knows. | Clue closes; no score change. |

**Ending the Game:**
1. **Next Round:** Once a round is cleared, click "Start Double Jeopardy" in the footer.
2. **Final Jeopardy:** After the final round, the "Reveal Final Clue" button will appear. This triggers the "Think!" theme and the high-stakes final category.
3. **Tie Breakers:** If scores are tied, use the **⚖️ Tie** button in System Controls to pull "Sudden Death" questions from your JSON.

---

### 4. Clue.json Format

Clue Format should be 
```json
{value: 0-1000, clue_text: "Hint", answer: "Question", daily_double: true/false}
```


**Example:**

The game expects a specific structure for rounds, final jeopardy, and tie breakers.
```json
{
  "game_metadata": {
    "title": "Ultimate Tech & Code Trivia",
    "date": "2026-01-01"
  },
  "rounds": [
    {
      "round_name": "Jeopardy",
      "categories": [
        {
          "category_name": "Web Dev",
          "clues": [
            {"value": 200, "clue_text": "This 'Language' is the standard markup for creating web pages.", "answer": "What is HTML?"},
            {"value": 400, "clue_text": "It stands for Cascading Style Sheets.", "answer": "What is CSS?"},
            {"value": 600, "clue_text": "This JS runtime allows you to run JavaScript on the server.", "answer": "What is Node.js?"},
            {"value": 800, "clue_text": "An HTTP 404 error code indicates this status.", "answer": "What is Not Found?", "daily_double": true},
            {"value": 1000, "clue_text": "This 'JSON' acronym stands for this.", "answer": "What is JavaScript Object Notation?"}
          ]
        }
```

---

### 5. Critical Troubleshooting

* **Connection Issues:** If the Board isn't updating, refresh the `/board` page first, then the `/admin` page.
* **Accessing via Raspberry Pi:** Find your computer's IP address (e.g., `192.168.1.15`). On the Pi's browser, go to `http://192.168.1.15:5000/board`.
* **JSON Errors:** If the game won't start, ensure your `clues.json` is in a folder named `data` and follows the format we discussed exactly.
* **No Audio** Be sure to click anywhere on the Viewers Board to unlock sounds. Check F12 for Errors.

---

### 6. Final Checklist

* [ ] `app.py` is running.
* [ ] `clues.json` has at least 6 categories for a full board.
* [ ] You have a way to play sounds (external speakers on the TV).
* [ ] The TV is set as an "Extended Display" (not mirrored) so you can keep the Admin panel hidden from players.
