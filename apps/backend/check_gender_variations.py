from verbecc import CompleteConjugator
import json

cc = CompleteConjugator(lang='fr')
res = cc.conjugate('aller')
raw_data = json.loads(res.to_json())

print("=== CHECKING FORM COUNTS PER TENSE ===\n")

for mood_name, mood_data in raw_data['moods'].items():
    if isinstance(mood_data, dict):
        print(f"{mood_name.upper()}:")
        for tense_name, tense_forms in mood_data.items():
            if isinstance(tense_forms, list):
                print(f"  {tense_name}: {len(tense_forms)} forms")
                
                # Show first few to see structure
                if len(tense_forms) > 9:
                    print(f"    → Has gender variations!")
                    for i in range(min(4, len(tense_forms))):
                        form_obj = tense_forms[i]
                        if isinstance(form_obj, dict):
                            conj = form_obj.get('c', [''])[0]
                            pronoun = form_obj.get('pr', '')
                            gender = form_obj.get('g', '')
                            print(f"      [{i}] {pronoun} ({gender}): {conj}")
        print()