import os
import json
import re
import sys 

quizzes_dir = "quizzes"

bad_strings = ["Wait, fixing", "Wait, my generation", "Fix Gen", "Fix:", "Real:", "Fixing generation", "Fixing.", "Stopping.", "Wait, "]

def dict_raise_on_duplicates(ordered_pairs):
    d = {}
    for k, v in ordered_pairs:
        if k in d:
            raise ValueError(f"Duplicate key: {k}")
        d[k] = v
    return d

errors = {}

for filename in os.listdir(quizzes_dir):
    if not filename.endswith(".json") or filename == "manifest.json":
        continue
    
    filepath = os.path.join(quizzes_dir, filename)
    file_errors = []
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f, object_pairs_hook=dict_raise_on_duplicates)
    except Exception as e:
        errors[filename] = [f"JSON parsing error: {str(e)}"]
        continue
        
    if "id" not in data: file_errors.append("Missing 'id'")
    if "title" not in data: file_errors.append("Missing 'title'")
    if "sections" not in data: 
        file_errors.append("Missing 'sections'")
    else:
        for s_idx, section in enumerate(data["sections"]):
            if "title" not in section: file_errors.append(f"Section {s_idx} missing 'title'")
            if "items" not in section: 
                file_errors.append(f"Section {s_idx} missing 'items'")
                continue
            
            for i_idx, item in enumerate(section["items"]):
                if "type" not in item: file_errors.append(f"Item {i_idx} missing 'type'")
                if "q" not in item: file_errors.append(f"Item {i_idx} missing 'q'")
                if "a" not in item: file_errors.append(f"Item {i_idx} missing 'a'")
                if "explanation" not in item: file_errors.append(f"Item {i_idx} missing 'explanation'")
                
                q_text = item.get("q", "")
                a_text = item.get("a", "")
                exp_text = item.get("explanation", "")
                
                for text_val, field_name in [(q_text, "q"), (a_text, "a"), (exp_text, "explanation")]:
                    if isinstance(text_val, str):
                        for bad in bad_strings:
                            if bad.lower() in text_val.lower():
                                file_errors.append(f"Item {i_idx} {field_name} contains AI artifact: '{bad}'")
                                break
                                
                if item.get("type") in ["multiple-choice", "true-false"]:
                    if "options" not in item:
                        file_errors.append(f"Item {i_idx} missing 'options' for type {item.get('type')}")
                        
    if file_errors:
        errors[filename] = file_errors

with open('validation_errors.json', 'w', encoding='utf-8') as f:
    json.dump(errors, f, indent=2)

print(f"Validation complete, found errors in {len(errors)} files.")
