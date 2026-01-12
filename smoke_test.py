import json
import uuid
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000/api"
PREFIX = f"test_{uuid.uuid4().hex[:8]}"
EMAIL = f"{PREFIX}@example.com"
USERNAME = PREFIX
PASSWORD = "password123"

def log(msg, success=True):
    icon = "[OK]" if success else "[FAIL]"
    print(f"{icon} {msg}")

def request(method, endpoint, data=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = json.dumps(data).encode('utf-8') if data else None
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except:
            # Try to extract Django exception
            import re
            match = re.search(r'<pre class="exception_value">([^<]+)</pre>', raw)
            if match:
                print(f"DJANGO EXCEPTION: {match.group(1)}")
            else:
                # Fallback: finding first pre block might help if it's a standard traceback
                match2 = re.search(r'<th>Exception Value:</th>\s*<td><pre>(.*?)</pre></td>', raw, re.DOTALL)
                if match2:
                    print(f"DJANGO EXCEPTION (Table): {match2.group(1)}")
            
            return e.code, raw # Return raw string if not JSON
    except Exception as e:
        print(f"Request Error: {e}")
        return 500, {}

def test_flow():
    # 1. Register
    print(f"\n[1] Registering {USERNAME}...")
    status, data = request("POST", "/auth/register/", {
        "username": USERNAME,
        "email": EMAIL,
        "password": PASSWORD,
        "native_language": "en"
    })
    
    if status == 201:
        log("Registration successful")
    else:
        log(f"Registration failed: {data}", False)
        return

    # 2. Login
    print("\n[2] Logging in...")
    status, data = request("POST", "/auth/login/", {
        "username": USERNAME,
        "password": PASSWORD
    })
    
    if status == 200:
        token = data['access']
        log("Login successful")
    else:
        log(f"Login failed: {data}", False)
        return

    # 3. Auth Me
    print("\n[3] Checking /auth/me/...")
    status, data = request("GET", "/auth/me/", token=token)
    if status == 200:
        log(f"Auth Me successful: {data.get('username')}")
    else:
        log(f"Auth Me failed: {data}", False)

    # 4. Start Session
    print("\n[4] Starting Session (Level 1)...")
    status, levels = request("GET", "/levels/", token=token)
    if not levels:
        log("No levels found", False)
        return
        
    level_id = levels[0]['id']
    
    status, session_data = request("POST", "/sessions/start/", {
        "level_id": level_id,
        "target_activities": 15 
    }, token=token)
    
    if status in [200, 201]:
        session_id = session_data['session_id']
        log(f"Session started: {session_id}")
    else:
        log(f"Start Session failed: {session_data}", False)
        return

    # 5. Get Next Activity
    print(f"\n[5] Fetching activities for Session {session_id}...")
    dictee_found = False
    
    for i in range(15): # Try more activities to hit a Dictee
        status, data = request("GET", f"/sessions/{session_id}/next-activity/", token=token)
        if status == 200:
            if data.get('session_complete'):
                print("Session Complete Early")
                break
                
            activity = data.get('activity')
            if activity:
                atype = activity.get('resourcetype')
                print(f"  - Activity {i+1}: {atype} (ID: {activity['id']})")
                
                if atype == 'DicteeActivity':
                    dictee_found = True
                    print(f"    >>> DICTEE FOUND! Correct Text: {activity.get('correct_text')}")
                    print(f"    >>> Audio URLs: {activity.get('audio_urls')}")
                
                # Submit
                s_status, s_data = request("POST", f"/sessions/{session_id}/submit/", {
                    "activity_id": activity['id'],
                    "user_answer": "test",
                    "client_attempt_uuid": str(uuid.uuid4())
                }, token=token)
        else:
            log(f"Next Activity failed: {status}", False)
            break
            
    if dictee_found:
        log("DicteeActivity was served successfully")
    else:
        print("⚠️ DicteeActivity not seen (could be random)")

if __name__ == "__main__":
    test_flow()
