import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
CLUES_FILE = BASE_DIR / "data" / "clues.json"

def validate_jeopardy_data():
    if not CLUES_FILE.exists():
        print(f"❌ ERROR: File not found at {CLUES_FILE}")
        return

    try:
        with open(CLUES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Check for Rounds
        if "rounds" not in data:
            print("❌ ERROR: Missing 'rounds' list.")
            return

        for r_idx, round_obj in enumerate(data["rounds"]):
            round_name = round_obj.get("round_name", f"Round {r_idx+1}")
            categories = round_obj.get("categories", [])
            
            print(f"\n--- Checking {round_name} ---")
            
            # Standard Jeopardy has 6 categories
            if len(categories) != 6:
                print(f"⚠️  Note: Found {len(categories)} categories. (Standard is 6)")

            for cat in categories:
                cat_name = cat.get("category_name", "Unknown")
                clues = cat.get("clues", [])
                
                # Check for 5 clues
                if len(clues) != 5:
                    print(f"❌ ERROR: Category '{cat_name}' has {len(clues)} clues (Must be 5).")
                
                # Check clue keys
                for clue in clues:
                    for key in ["value", "clue_text", "answer"]:
                        if key not in clue:
                            print(f"❌ ERROR: A clue in '{cat_name}' is missing '{key}'")
                            return

        # Check Final Jeopardy
        if "final_jeopardy" not in data:
            print("❌ ERROR: Missing 'final_jeopardy' section.")
        else:
            print("\n✅ Final Jeopardy structure is present.")

        print("\n🎉 VALIDATION COMPLETE")

    except json.JSONDecodeError as e:
        print(f"❌ JSON Syntax Error: {e}")

if __name__ == "__main__":
    validate_jeopardy_data()