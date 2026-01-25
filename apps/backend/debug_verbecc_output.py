from verbecc import CompleteConjugator
import json

try:
    conjugator = CompleteConjugator(lang='fr')
    conjugation = conjugator.conjugate('aller')
    # Use to_json() which returns a string, then parse it back to dict for inspection
    data = json.loads(conjugation.to_json())
    
    # Drill down to indicatif présent to see the structure of the forms
    mood = data.get('moods', {}).get('indicatif', {})
    tense = mood.get('présent', [])
    
    print("--- Indicatif Présent Data ---")
    print(json.dumps(tense, indent=2))
    
    print("\n--- Type of first item ---")
    if tense:
        print(type(tense[0]))

except Exception as e:
    print(e)
