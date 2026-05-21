# BSidesSD Hacker Jeopardy - A full Web App with Admin Panel and Viewerboards.
#
# Copyright (C) 2026 Atr0jan <ATr0j4n@Gmail.com>
# SPDX-License-Identifier: GPL-3.0-or-later

import json
from pathlib import Path

class JeopardyGame:
    def __init__(self, json_path):
        self.json_path = json_path
        self.data = self._load_data()
        self.teams = []
        self.current_round_index = 0  # 0 for Jeopardy, 1 for Double Jeopardy
        self.played_clues = []        # Tracks "catIdx-clueIdx" to dim them on the board

    def _load_data(self):
        with open(self.json_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def set_teams(self, names):
        """Initializes teams with a starting score of 0."""
        self.teams = [{"name": name, "score": 0} for name in names]

    def get_current_round_data(self):
        """Returns the categories and clues for the active round."""
        return self.data["rounds"][self.current_round_index]

    def update_score(self, team_name, amount, is_correct):
        """Adjusts team score and returns the updated teams list."""
        for team in self.teams:
            if team["name"] == team_name:
                if is_correct:
                    team["score"] += amount
                else:
                    team["score"] -= amount
        return self.teams

    def mark_clue_played(self, cat_idx, clue_idx):
        """Adds a clue identifier to the played list."""
        clue_id = f"{cat_idx}-{clue_idx}"
        if clue_id not in self.played_clues:
            self.played_clues.append(clue_id)

    def next_round(self):
        """Advances the round index and clears the played clues list."""
        if self.current_round_index < len(self.data["rounds"]) - 1:
            self.current_round_index += 1
            self.played_clues = []
            return True
        return False

    def get_final_jeopardy(self):
        """Returns the Final Jeopardy category and clue."""
        return self.data.get("final_jeopardy")

    def get_tie_breaker(self, index=0):
        """Returns a specific tie-breaker clue if needed."""
        tie_breakers = self.data.get("tie_breakers", [])
        if index < len(tie_breakers):
            return tie_breakers[index]
        return None

    def get_state(self):
        """Returns a snapshot of the current game state for the UI."""
        return {
            "teams": self.teams,
            "current_round": self.data["rounds"][self.current_round_index]["round_name"],
            "played_clues": self.played_clues
        }