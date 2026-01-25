from verbecc import CompleteConjugator
import json

cc = CompleteConjugator(lang='fr')
res = cc.conjugate('aller')
raw_data = json.loads(res.to_json())

print("=== IMPERATIF TENSES ===")
imperatif = raw_data['moods'].get('imperatif', {})
for tense_name in imperatif.keys():
    print(f"  '{tense_name}'")

print("\n=== IMPERATIF PRÉSENT FORMS ===")
# Try different possible names
for possible_name in ['présent', 'imperatif-présent', 'imperatif-present']:
    if possible_name in imperatif:
        print(f"Found as: '{possible_name}'")
        forms = imperatif[possible_name]
        for i, form in enumerate(forms):
            if isinstance(form, dict):
                print(f"  {i}: {form.get('pr', '?')} - {form.get('c', [''])[0]}")