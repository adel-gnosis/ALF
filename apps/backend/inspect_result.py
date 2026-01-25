try:
    from verbecc import CompleteConjugator
    cc = CompleteConjugator(lang='fr')
    res = cc.conjugate('aller')
    print("Result Type:", type(res))
    print("Methods:", [m for m in dir(res) if not m.startswith('_')])
    
    if hasattr(res, 'to_json'):
        print("Has to_json()")
        try:
            print("to_json result:", type(res.to_json()))
        except Exception as e:
            print("to_json failed:", e)
            
    if hasattr(res, 'serialize'):
        print("Has serialize()")
        
except Exception as e:
    print(e)
