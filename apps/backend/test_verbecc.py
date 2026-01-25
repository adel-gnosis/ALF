try:
    from verbecc import CompleteConjugator
    
    print("\n--- Testing CompleteConjugator(lang='fr') ---")
    try:
        cc = CompleteConjugator(lang='fr')
        print(f"CompleteConjugator(lang='fr') created: {type(cc)}")
        res = cc.conjugate('aller')
        print("Result type:", type(res))
        print("Result keys:", res.keys() if isinstance(res, dict) else "Not a dict")
        # Print a sample to verify structure
        import json
        print(json.dumps(res, indent=2)[:200]) # First 200 chars
    except Exception as e:
        print(f"CompleteConjugator error: {e}")

except ImportError as e:
    print(f"ImportError: {e}")
