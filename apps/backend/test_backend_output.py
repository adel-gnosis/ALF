from verbecc import CompleteConjugator
import json

cc = CompleteConjugator(lang='fr')
res = cc.conjugate('aller')
raw_data = json.loads(res.to_json())

# Helper function to strip pronouns
def strip_pronoun(conjugation, pronoun):
    """Remove pronoun from conjugation"""
    if not conjugation or not pronoun:
        return conjugation
    
    # Handle elided forms (j', t', etc.)
    elided = f"{pronoun[0]}'"
    if conjugation.startswith(elided):
        return conjugation[len(elided):]
    
    # Handle standard forms with space
    with_space = f"{pronoun} "
    if conjugation.startswith(with_space):
        return conjugation[len(with_space):]
    
    return conjugation

# Process conjugation data with pronoun stripping
def process_conjugation_data(data):
    if not isinstance(data, dict):
        return data
    
    moods_data = data.get('moods', {})
    if not isinstance(moods_data, dict):
        return data
    
    processed = {'moods': {}}
    
    for key, value in data.items():
        if key != 'moods':
            processed[key] = value
    
    PRONOUNS = ['je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles']
    
    for mood_name, mood_data in moods_data.items():
        if not isinstance(mood_data, dict):
            processed['moods'][mood_name] = mood_data
            continue
        
        processed['moods'][mood_name] = {}
        
        for tense_name, tense_forms in mood_data.items():
            if isinstance(tense_forms, list):
                pronoun_map = {}
                
                for form_obj in tense_forms:
                    if isinstance(form_obj, dict):
                        pronoun = form_obj.get('pr', '')
                        conjugation = form_obj.get('c', [])
                        gender = form_obj.get('g', '')
                        
                        if isinstance(conjugation, list) and len(conjugation) > 0:
                            conj_str = conjugation[0]
                        elif isinstance(conjugation, str):
                            conj_str = conjugation
                        else:
                            conj_str = ''
                        
                        # STRIP PRONOUN HERE
                        clean_verb = strip_pronoun(conj_str, pronoun)
                        
                        if pronoun not in pronoun_map:
                            pronoun_map[pronoun] = clean_verb
                        elif gender == 'm' or gender == '':
                            pronoun_map[pronoun] = clean_verb
                
                processed_forms = []
                for pronoun in PRONOUNS:
                    processed_forms.append(pronoun_map.get(pronoun, ''))
                
                processed['moods'][mood_name][tense_name] = processed_forms
            else:
                processed['moods'][mood_name][tense_name] = tense_forms
    
    return processed

processed = process_conjugation_data(raw_data)

print("=== INDICATIF > PRÉSENT ===")
present = processed['moods']['indicatif']['présent']
for i, form in enumerate(present):
    pronoun = ['je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles'][i]
    print(f"{pronoun}: '{form}'")

print("\n=== INDICATIF > FUTUR-SIMPLE (elision test) ===")
futur = processed['moods']['indicatif']['futur-simple']
for i, form in enumerate(futur):
    pronoun = ['je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles'][i]
    print(f"{pronoun}: '{form}'")

print("\n=== INDICATIF > PASSÉ-COMPOSÉ ===")
passe = processed['moods']['indicatif']['passé-composé']
for i, form in enumerate(passe):
    pronoun = ['je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles'][i]
    print(f"{pronoun}: '{form}'")

print("\n=== CONDITIONNEL > PASSÉ ===")
cond_passe = processed['moods']['conditionnel']['passé']
for i, form in enumerate(cond_passe):
    pronoun = ['je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles'][i]
    print(f"{pronoun}: '{form}'")