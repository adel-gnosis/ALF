from verbecc import CompleteConjugator
import json

cc = CompleteConjugator(lang='fr')
res = cc.conjugate('aller')

# Convert to JSON string first, then parse
json_str = res.to_json()
data = json.loads(json_str)

print("=== AVAILABLE MOODS ===")
for mood_name in data.keys():
    if mood_name != 'value' and isinstance(data[mood_name], dict):
        print(f"\n{mood_name}:")
        for tense_name in data[mood_name].keys():
            print(f"  - {tense_name}")

print("\n=== SAMPLE: indicatif > présent ===")
try:
    present_forms = data['indicatif']['présent']
    print(f"Type: {type(present_forms)}")
    print(f"Length: {len(present_forms)}")
    
    for i, form_obj in enumerate(present_forms):
        print(f"\n{i}: {type(form_obj)}")
        if isinstance(form_obj, dict):
            print(f"  Keys: {form_obj.keys()}")
            print(f"  pr (pronoun): {form_obj.get('pr')}")
            print(f"  c (conjugation): {form_obj.get('c')}")
            print(f"  Full: {form_obj}")
except KeyError as e:
    print(f"KeyError: {e}")

print("\n=== SAMPLE: indicatif > futur simple ===")
try:
    futur = data['moods']['indicatif'].get('futur simple')
    if futur:
        print("Found 'futur simple'")
        print(f"First form: {futur[0]}")
    else:
        print("'futur simple' not found. Available tenses:")
        print(list(data['moods']['indicatif'].keys()))
except Exception as e:
    print(f"Error: {e}")

print("\n=== SAMPLE: indicatif > passé composé ===")
try:
    passe = data['moods']['indicatif'].get('passé composé')
    if passe:
        print("Found 'passé composé'")
        print(f"First form: {passe[0]}")
    else:
        print("'passé composé' not found. Available tenses:")
        print(list(data['moods']['indicatif'].keys()))
except Exception as e:
    print(f"Error: {e}")

print("\n=== FULL STRUCTURE (first 3000 chars) ===")
print(json.dumps(data, indent=2, ensure_ascii=False)[:3000])