from flask import Flask, render_template, url_for, jsonify, send_from_directory
from flask_socketio import SocketIO, emit
from pathlib import Path
import json
from game_logic import JeopardyGame

# --- INITIALIZATION ---
BASE_DIR = Path(__file__).resolve().parent
# Initialize the game logic class with your JSON path
game = JeopardyGame(BASE_DIR / "data" / "clues.json")

app = Flask(__name__)
app.config['SECRET_KEY'] = 'tech_trivia_2026'
socketio = SocketIO(app, cors_allowed_origins="*")

# In-memory storage for game history (can be written to file on reset)
game_history = []

# --- ROUTES ---
# Load Browser Favorite Icon
@app.route('/favicon.ico')
def favicon():
    """
    Serves the favicon using pathlib for path consistency. 
    Ensure the file exists at: static/favicon.ico
    """
    static_path = BASE_DIR / "static"
    return send_from_directory(str(static_path), 'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/')
def lobby():
    return render_template('lobby.html')

@app.route('/board')
def board():
    # Use the class methods to get data
    return render_template('board.html', round_data=game.get_current_round_data(), state=game.get_state())

@app.route('/admin')
def admin():
    # Ensure these variables match what you are calling in the HTML
    return render_template('admin.html', round_data=game.get_current_round_data(), state=game.get_state())

@app.route('/export_results')
def export_results():
    """Download current team standings as JSON for post-event posting."""
    return jsonify({
        "round": game.get_state()["current_round"],
        "standings": game.teams,
        "history": game_history
    })

# --- SOCKET EVENTS ---

@socketio.on('initialize_game')
def handle_init(data):
    # 1. Set game mode and initialize teams
    game.multiplier_mode = data.get('multiplier_mode', False)
    game.daily_doubles_enabled = data.get('daily_doubles_enabled', True)
    game.set_teams(data['teams'])
    
    # 2. Get the fresh state
    current_state = game.get_state()
    
    # 3. Broadcast the fresh team list to all open Admin/Board pages
    emit('update_ui', {
        "teams": current_state["teams"],
        "played_clues": current_state["played_clues"],
        "multiplier_mode": current_state["multiplier_mode"],
        "daily_doubles_enabled": current_state["daily_doubles_enabled"]
    }, broadcast=True)
    
    # 4. Tell the Lobby specifically to redirect to the Admin panel
    emit('redirect_to_board', broadcast=True)

@socketio.on('submit_verdict')
def handle_verdict(data):
    team_name = data['team_name']
    is_correct = data['correct']
    val = int(data['value'])
    cat_idx = int(data['cat_idx'])
    clue_idx = int(data['clue_idx'])

    # 1. Update the score in the logic class
    updated_teams = game.update_score(team_name, val, is_correct)
    
    # Log the event for post-game export
    game_history.append({
        "team": team_name,
        "value": val,
        "correct": is_correct,
        "clue": f"{cat_idx}-{clue_idx}"
    })
    
    # 2. If correct, mark it as played so it dims on the grid
    if is_correct:
        game.mark_clue_played(cat_idx, clue_idx)

    # Update control team in the game state
    if is_correct:
        game.control_team = team_name

    # 3. Tell everyone to update their UI
    emit('update_ui', {
        "teams": updated_teams,
        "played_clues": game.played_clues,
        "close_clue": is_correct,
        "clue_id": f"{cat_idx}-{clue_idx}",
        "team_who_answered": team_name,
        "was_correct": is_correct,
        "control_team": game.control_team
    }, broadcast=True)

@socketio.on('force_close_clue')
def handle_force_close(data):
    # "No one got it right"
    # data format: {'clue_id': '0-1'}
    parts = data['clue_id'].split('-')
    game.mark_clue_played(int(parts[0]), int(parts[1]))
    
    # Optional: Clear control if no one got it
    game.control_team = None

    emit('update_ui', {
        "teams": game.teams,
        "played_clues": game.played_clues,
        "close_clue": True,
        "clue_id": data['clue_id'],
        "control_team": game.control_team
    }, broadcast=True)

@socketio.on('admin_reveal_clue')
def handle_reveal(data):
    print(f"Server received reveal: {data.get('text', '>>> Daily Double Splash <<<')}") 

    # We send this back out to everyone, including the Board
    emit('admin_reveal_clue', data, broadcast=True)

@socketio.on('admin_reveal_answer')
def handle_reveal_answer(data):
    # Broadcast the answer to the viewers board
    emit('reveal_answer', data, broadcast=True)

@socketio.on('next_round')
def handle_next_round():
    if game.next_round():
        # Move to Double Jeopardy
        emit('change_round', {"round_name": game.get_current_round_data()["round_name"]}, broadcast=True)
    else:
        # No more standard rounds, trigger Final Jeopardy sequence
        final_data = game.get_final_jeopardy()
        if final_data:
            emit('board_show_final_category', {"category": final_data["category"]}, broadcast=True)
            emit('admin_final_ready', final_data, broadcast=True)

@socketio.on('reveal_final_clue')
def handle_reveal_final():
    final_data = game.get_final_jeopardy()
    if final_data:
        emit('admin_reveal_clue', {"text": final_data["clue_text"]}, broadcast=True)

@socketio.on('trigger_tie_breaker')
def handle_tie_breaker():
    # Fetch the clue based on the current index
    clue = game.get_tie_breaker(game.tie_breaker_index)
    if clue:
        # Increment the index so the next click pulls the next question
        game.tie_breaker_index += 1
        # 1. Reveal text on the viewers' board
        emit('admin_reveal_clue', {"text": clue["clue_text"]}, broadcast=True)
        # 2. Tell the admin to open the judging modal with the answer
        emit('admin_open_tie_breaker', clue, broadcast=True)

@socketio.on('manual_score_adjust')
def handle_manual_adjust(data):
    updated_teams = game.update_score(data['name'], data['amount'], True)
    emit('update_ui', {"teams": updated_teams}, broadcast=True)

@socketio.on('request_sync')
def handle_sync():
    state = game.get_state()
    emit('update_ui', {
        "teams": state["teams"],
        "multiplier_mode": state["multiplier_mode"],
        "daily_doubles_enabled": state["daily_doubles_enabled"],
        "played_clues": state["played_clues"],
        "current_round": state["current_round"],
        "control_team": state["control_team"]
    }, broadcast=True)

@socketio.on('toggle_multiplier_mode')
def handle_toggle_mode(data):
    game.multiplier_mode = data.get('enabled', False)
    emit('update_ui', {"multiplier_mode": game.multiplier_mode}, broadcast=True)

@socketio.on('reset_game')
def handle_reset():
    # Save current state to a file before clearing
    with open('last_game_results.json', 'w') as f:
        json.dump({"teams": game.teams, "history": game_history}, f)
        
    game.tie_breaker_index = 0
    game.played_clues = []
    game_history.clear()
    for team in game.teams:
        team['score'] = 0
    emit('update_ui', {"teams": game.teams, "played_clues": [], "reset": True}, broadcast=True)

# --- START SERVER ---
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)