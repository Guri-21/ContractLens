import json
import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

def dump():
    openapi_schema = app.openapi()
    
    # Determine repo root (d:/Projects/ContractLens)
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_path = os.path.join(repo_root, "..", "openapi.json")
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2)
        
    print(f"OpenAPI spec successfully dumped to {output_path}")

if __name__ == "__main__":
    dump()
