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
* Click **"LAUNCH GAME"**.


4. **The Admin Shift:**
The Lobby will automatically redirect you to `http://localhost:5000/admin`. Keep this on your laptop or tablet—this is your private control panel.

---

### 3. Gameplay Flow (The "Host" Routine)

Once the game is live, your workflow as the host looks like this:

| Action | Admin Interaction | Result on Board (TV) |
| --- | --- | --- |
| **Pick Clue** | Click a dollar amount on your grid. | Grid disappears; Clue text appears. |
| **Buzzer** | Listen for the sound, then click the Team Name in your popup. | That team’s score card glows/pops out. |
| **Judge** | Click **CORRECT (+)** or **INCORRECT (-)**. | Score updates; Board plays sound; Grid returns if correct. |
| **Stumped** | Click **"No One Got It"** if no one knows. | Clue closes; no score change. |

---

### 4. Critical Troubleshooting

* **Connection Issues:** If the Board isn't updating, refresh the `/board` page first, then the `/admin` page.
* **Accessing via Raspberry Pi:** Find your computer's IP address (e.g., `192.168.1.15`). On the Pi's browser, go to `http://192.168.1.15:5000/board`.
* **JSON Errors:** If the game won't start, ensure your `clues.json` is in a folder named `data` and follows the format we discussed exactly.
* **No Audio** Be sure to click anywhere on the Viewers Board to unlock sounds. Check F12 for Errors.

---

### 5. Final Checklist

* [ ] `app.py` is running.
* [ ] `clues.json` has at least 6 categories for a full board.
* [ ] You have a way to play sounds (external speakers on the TV).
* [ ] The TV is set as an "Extended Display" (not mirrored) so you can keep the Admin panel hidden from players.
