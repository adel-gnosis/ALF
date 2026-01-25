from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from verbecc import CompleteConjugator
import json


class ConjugationView(APIView):
    """
    Returns full conjugation table for a given French verb using verbecc.
    """
    permission_classes = []  # Open tool, or use IsAuthenticated if preferred

    def get(self, request):
        verb = request.query_params.get('verb')
        if not verb:
            return Response(
                {"error": "Missing 'verb' query parameter"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            conjugator = CompleteConjugator(lang='fr')
            conjugation = conjugator.conjugate(verb)
            
            # Convert to JSON and parse back
            raw_data = json.loads(conjugation.to_json())
            
            # Process the data to extract conjugation strings
            processed_data = self._process_conjugation_data(raw_data)
            
            return Response(processed_data)

        except Exception as e:
            # verbecc raises exceptions for unknown verbs usually
            return Response(
                {"error": f"Failed to conjugate '{verb}'", "details": str(e)},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def _process_conjugation_data(self, data):
        """
        Process verbecc conjugation data to extract conjugation strings.
        
        Verbecc returns conjugations as objects like:
        {'c': ['je vais'], 'n': 's', 'p': '1', 'pr': 'je', 'g': 'm'}
        
        For tenses with gender variations (passé composé, etc.), we:
        1. Group by pronoun
        2. Prefer masculine ('m') forms
        3. Strip pronouns from conjugations
        4. Return exactly 9 forms (je, tu, il, elle, on, nous, vous, ils, elles)
        """
        if not isinstance(data, dict):
            return data
        
        # Extract the 'moods' section
        moods_data = data.get('moods', {})
        if not isinstance(moods_data, dict):
            return data
        
        processed = {'moods': {}}
        
        # Copy non-mood data (like 'verb' metadata)
        for key, value in data.items():
            if key != 'moods':
                processed[key] = value
        
        # Define expected pronoun order
        PRONOUNS = ['je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles']
        
        # Process each mood (indicatif, subjonctif, etc.)
        for mood_name, mood_data in moods_data.items():
            if not isinstance(mood_data, dict):
                processed['moods'][mood_name] = mood_data
                continue
            
            processed['moods'][mood_name] = {}
            
            # Process each tense within the mood
            for tense_name, tense_forms in mood_data.items():
                if isinstance(tense_forms, list):
                    # Group forms by pronoun and prefer masculine
                    pronoun_map = {}
                    
                    for form_obj in tense_forms:
                        if isinstance(form_obj, dict):
                            pronoun = form_obj.get('pr', '')
                            conjugation = form_obj.get('c', [])
                            gender = form_obj.get('g', '')
                            
                            # Extract conjugation string
                            if isinstance(conjugation, list) and len(conjugation) > 0:
                                conj_str = conjugation[0]
                            elif isinstance(conjugation, str):
                                conj_str = conjugation
                            else:
                                conj_str = ''
                            
                            # STRIP PRONOUN from the conjugation
                            # "je vais" → "vais", "j'irai" → "irai"
                            clean_verb = self._strip_pronoun(conj_str, pronoun)
                            
                            # Store in pronoun_map
                            # Priority: masculine ('m') or no gender > feminine ('f')
                            if pronoun not in pronoun_map:
                                pronoun_map[pronoun] = clean_verb
                            elif gender == 'm' or gender == '':
                                # Prefer masculine or neutral forms
                                pronoun_map[pronoun] = clean_verb
                            # If already exists and current is feminine, skip
                    
                    # Build the final ordered list of 9 forms
                    processed_forms = []
                    for pronoun in PRONOUNS:
                        if pronoun in pronoun_map:
                            processed_forms.append(pronoun_map[pronoun])
                        else:
                            # Fallback if pronoun not found
                            processed_forms.append('')
                    
                    processed['moods'][mood_name][tense_name] = processed_forms
                else:
                    # Not a list, keep as-is
                    processed['moods'][mood_name][tense_name] = tense_forms
        
        return processed
    
    def _strip_pronoun(self, conjugation: str, pronoun: str) -> str:
        """
        Remove pronoun from conjugation string.
        
        Examples:
        - "je vais" → "vais"
        - "j'irai" → "irai"
        - "tu vas" → "vas"
        - "nous allons" → "allons"
        """
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
        
        # If no pronoun found, return as-is
        return conjugation