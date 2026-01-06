
import os
import django
from django.conf import settings

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import translation
from django.utils.translation import gettext as _

def test_serializer_logic():
    user_lang = 'ar'
    translation.activate(user_lang)
    
    # Simulate data matching the DB
    question_text_key = "activity.mcq.translate_word"
    translation_data = {"word": "key:word.book"}
    
    print(f"Current Language: {translation.get_language()}")
    
    # 1. Translate string format
    try:
        trans_str = _(question_text_key)
        print(f"Translated Format String: {trans_str}")
    except Exception as e:
        print(f"Error getting format string: {e}")
        return

    # 2. Process translation data
    safe_context = {}
    if translation_data:
        for k, v in translation_data.items():
            if isinstance(v, str) and v.startswith('key:'):
                key = v.replace('key:', '', 1)
                try:
                    translated_val = _(key)
                    print(f"Translating key '{key}' -> '{translated_val}'")
                    safe_context[k] = translated_val
                except Exception as e:
                    print(f"Error translating value: {e}")
                    safe_context[k] = v
            else:
                safe_context[k] = v
                
    print(f"Safe Context: {safe_context}")
    
    # 3. Interpolate
    try:
        final_text = trans_str.format(**safe_context)
        print(f"Final Text: {final_text}")
    except Exception as e:
        print(f"Interpolation Error: {e}")

if __name__ == "__main__":
    test_serializer_logic()
