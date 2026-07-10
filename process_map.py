import os
import json
import urllib.request

url = "https://cdn.jsdelivr.net/npm/@svg-maps/cambodia/index.js"
dst_path = r"d:\project\backend-frontend\bot dc\dashboard\src\data\cambodia-map-data.ts"

try:
    print("📡 Fetching Cambodia SVG map data directly from CDN...")
    # Add a standard user agent to avoid CDN block
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    with urllib.request.urlopen(req) as response:
        content = response.read().decode('utf-8')
    
    # Extract JSON part from JavaScript export
    json_line = ""
    for line in content.splitlines():
        if line.strip().startswith("export default "):
            json_line = line.replace("export default ", "").strip()
            # Remove trailing semicolon if present
            if json_line.endswith(";"):
                json_line = json_line[:-1]
            break
            
    if not json_line:
        # Fallback if it is a raw JSON structure
        cleaned = content.strip()
        if cleaned.startswith("{"):
            json_line = cleaned

    if json_line:
        # Parse and validate JSON
        data = json.loads(json_line)
        
        # Save as a clean TypeScript module
        os.makedirs(os.path.dirname(dst_path), exist_ok=True)
        with open(dst_path, "w", encoding="utf-8") as f:
            f.write("export const cambodiaMapData = ")
            json.dump(data, f, ensure_ascii=False)
            f.write(";\n")
        print("✅ Cambodia map data compiled successfully into cambodia-map-data.ts!")
    else:
        print("❌ Could not locate the 'export default' block in the script.")
except Exception as e:
    print(f"❌ Failed to fetch or parse map data: {e}")
