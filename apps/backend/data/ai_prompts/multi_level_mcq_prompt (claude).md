Universal French Learning Activity Generator
CRITICAL: Read ALL Instructions Before Generating
This prompt generates activities for a French learning platform with multiple subjects and 6 activity types. You MUST follow the configuration provided by the user.

Available Activity Types
1. MCQActivity (Multiple Choice - Single Answer)
{
  "type": "MCQActivity",
  "question_text": "Question here?",
  "choices": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correct_answer_index": 2,  // ← INDEX (0-based)
  "explanation": "Why this answer is correct",
  "points": 10,
  "difficulty": "EASY"
}
2. MultipleAnswerActivity (Multiple Choice - Multiple Correct)
{
  "type": "MultipleAnswerActivity",
  "question_text": "Select ALL correct answers:",
  "choices": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correct_indices": [0, 2, 3],  // ← LIST of correct indices
  "explanation": "Options 1, 3, and 4 are correct because...",
  "points": 15,
  "difficulty": "MEDIUM"
}
3. FillBlankActivity (Fill in the Blank)
{
  "type": "FillBlankActivity",
  "question_text": "Je ___ étudiant. (être)",
  "correct_answer": "suis",
  "explanation": "Conjugation of être for 'je' is 'suis'",
  "points": 10,
  "difficulty": "EASY"
}
4. TextInputActivity (Open Text Input)
{
  "type": "TextInputActivity",
  "question_text": "How do you say 'apple' in French?",
  "correct_answers": ["pomme", "une pomme", "la pomme"],  // ← Multiple acceptable answers
  "case_sensitive": false,
  "accept_partial": false,
  "explanation": "Apple in French is 'pomme'",
  "points": 10,
  "difficulty": "EASY"
}
5. DragOrderActivity (Arrange Words in Order)
{
  "type": "DragOrderActivity",
  "question_text": "Arrange these words to form a correct sentence:",
  "words": ["Je", "suis", "un", "étudiant"],
  "correct_order": [0, 1, 2, 3],  // ← Correct sequence (indices)
  "explanation": "The correct order is: Je suis un étudiant",
  "points": 15,
  "difficulty": "MEDIUM"
}
6. ConjugationActivity (Verb Conjugation)
{
  "type": "ConjugationActivity",
  "question_text": "Conjugate 'être' for 'je' in présent",
  "verb_infinitive": "être",
  "tense": "présent",
  "pronoun": "je",
  "correct_conjugation": "suis",
  "explanation": "être + je + présent = suis",
  "points": 10,
  "difficulty": "EASY"
}
7. MatchingActivity (Match Pairs)
{
  "type": "MatchingActivity",
  "question_text": "Match the French words with their English translations:",
  "pairs": {
    "chat": "cat",
    "chien": "dog",
    "maison": "house",
    "voiture": "car"
  },
  "explanation": "These are common French-English translations",
  "points": 15,
  "difficulty": "EASY"
}

Subject Categories & Topics
Grammaire (Grammar)
    • Articles (le, la, les, un, une, des) 
    • Gender and number agreement 
    • Adjectives and placement 
    • Present tense 
    • Past tenses (passé composé, imparfait) 
    • Future tenses 
    • Conditional mood 
    • Subjunctive mood 
    • Pronouns (subject, object, relative) 
    • Prepositions 
    • Complex sentences 
Conjugaison (Verb Conjugation)
    • Present tense conjugation 
    • Passé composé (with avoir/être) 
    • Imparfait 
    • Futur simple 
    • Futur antérieur 
    • Conditionnel présent/passé 
    • Subjonctif présent/passé 
    • Plus-que-parfait 
    • Irregular verbs 
    • Reflexive verbs 
Vocabulaire (Vocabulary)
    • Basic nouns (animals, objects, food) 
    • Common verbs 
    • Adjectives (colors, sizes, emotions) 
    • Numbers and time 
    • Family members 
    • Professions 
    • Places and locations 
    • Daily activities 
    • Hobbies and sports 
    • Weather and seasons 
Compréhension (Reading Comprehension)
    • Short sentences understanding 
    • Paragraph comprehension 
    • Dialogue interpretation 
    • Story comprehension 
    • Inference questions 
    • Main idea identification 
    • Detail extraction 
    • Context clues 
Expression (Writing/Expression)
    • Sentence construction 
    • Paragraph writing 
    • Letter/email writing 
    • Descriptive writing 
    • Narrative writing 
    • Opinion writing 
    • Formal vs informal register 
Prononciation (Pronunciation)
    • Phonetic exercises 
    • Liaison rules 
    • Silent letters 
    • Accent distinctions 
    • Intonation patterns 

CEFR Level Mapping (30 Levels)
Levels
CEFR
Difficulty
Description
1-8
A1
EASY
Absolute basics, survival French
9-16
A2
EASY/MEDIUM
Basic conversations, common phrases
17-24
B1
MEDIUM/HARD
Intermediate grammar, nuanced concepts
25-30
B2
HARD
Advanced structures, complex topics

Generation Instructions
INPUT FORMAT (User Provides):
Activity Type: [MCQActivity/MultipleAnswerActivity/etc.]
Subject: [Grammaire/Conjugaison/Vocabulaire/etc.]
Levels: [1-30 or 5-15 or specific range]
Activities per Level: [1, 2, 3, or 5]
Difficulty: [Automatic/EASY/MEDIUM/HARD]
OUTPUT FORMAT:
{
  "subject": "[Subject Name]",
  "activity_type": "[Activity Type]",
  "levels": [1, 2, 3, ...],  // ← ALL levels in range
  "activities": [
    // Activities here - sorted by level
  ]
}

CRITICAL RULES
1. Progressive Difficulty
    • Each level should be SLIGHTLY harder than the previous 
    • Build on concepts from earlier levels 
    • Maintain logical learning progression 
    • Don't jump difficulty too quickly 
2. Activity Distribution
    • If user requests 3 activities per level → generate exactly 3 per level 
    • Mix activity types if appropriate for the subject 
    • Ensure variety in question formats 
3. Subject-Specific Guidelines
For Grammaire:
    • Focus on rules, structures, agreements 
    • Include grammatical explanations 
    • Use MCQActivity, FillBlankActivity, MultipleAnswerActivity 
For Conjugaison:
    • Use ConjugationActivity, FillBlankActivity, MCQActivity 
    • Cover different tenses progressively 
    • Include irregular verbs at higher levels 
For Vocabulaire:
    • Use MCQActivity, MatchingActivity, TextInputActivity 
    • Start with concrete nouns, progress to abstract 
    • Include synonyms/antonyms at higher levels 
For Compréhension:
    • Use MCQActivity, MultipleAnswerActivity 
    • Provide context (short texts/dialogues) 
    • Ask inference questions at higher levels 
4. Quality Standards
    • ✅ Clear, unambiguous questions 
    • ✅ Plausible distractors (wrong answers that seem reasonable) 
    • ✅ Detailed explanations 
    • ✅ Appropriate difficulty for level 
    • ✅ Correct JSON formatting 
    • ❌ No duplicate questions 
    • ❌ No ambiguous correct answers 
    • ❌ No culturally insensitive content 
5. JSON Formatting
    • Use proper escaping for special characters 
    • Use double quotes for strings 
    • Ensure valid JSON structure 
    • Test with a JSON validator if possible 

Example Generation Request
USER INPUT:
Activity Type: MCQActivity
Subject: Vocabulaire
Levels: 1-10
Activities per Level: 2
Difficulty: Automatic
YOUR OUTPUT:
{
  "subject": "Vocabulaire",
  "activity_type": "MCQActivity",
  "levels": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  "activities": [
    {
      "level": 1,
      "type": "MCQActivity",
      "question_text": "What is 'cat' in French?",
      "choices": ["chien", "chat", "maison", "voiture"],
      "correct_answer_index": 1,
      "explanation": "'Chat' means cat in French.",
      "points": 10,
      "difficulty": "EASY"
    },
    {
      "level": 1,
      "type": "MCQActivity",
      "question_text": "What is 'dog' in French?",
      "choices": ["chat", "chien", "oiseau", "poisson"],
      "correct_answer_index": 1,
      "explanation": "'Chien' means dog in French.",
      "points": 10,
      "difficulty": "EASY"
    },
    // ... continue for all levels 1-10, with 2 activities each
  ]
}

File Naming Convention
Save as: backend/data/activities/[subject]_[type]_[batch].json
Examples:
    • grammaire_mcq_batch1.json 
    • vocabulaire_mixed_levels1-15.json 
    • conjugaison_conjugation_all.json 

Import Command
python manage.py import_activities backend/data/activities/[filename].json

BEFORE YOU START GENERATING:
Confirm you understand:
    1. ✅ The activity type format required 
    2. ✅ The subject and topic progression 
    3. ✅ The level range and quantity per level 
    4. ✅ The difficulty mapping 
    5. ✅ The JSON output format 
Then generate the complete JSON file with ALL requested activities.

Ready to Generate?
Tell me:
    1. Activity Type: [Choose from 7 types above] 
    2. Subject: [Choose from 6 subjects above] 
    3. Levels: [Range like 1-30 or 5-15] 
    4. Activities per Level: [Number like 1, 2, 3, or 5] 
    5. Difficulty: [Automatic or Fixed] 
I'll generate the perfect JSON file for your import! 🚀

