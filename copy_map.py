import os
import shutil

base_dir = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(base_dir, "world-map", "public", "world-map.json")
dst = os.path.join(base_dir, "dashboard", "public", "world-map.json")

os.makedirs(os.path.dirname(dst), exist_ok=True)
shutil.copy(src, dst)
print("✅ Map file copied successfully from world-map to dashboard public folder!")
