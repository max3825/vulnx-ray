
import re

def analyze_balance(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    stack = []
    
    for i, line in enumerate(lines):
        for char in line:
            if char in '{(':
                stack.append((char, i + 1))
            elif char in '})':
                if not stack:
                    print(f"Error: Unmatched '{char}' at line {i+1}")
                    continue
                
                last_open, last_line = stack.pop()
                expected = '}' if last_open == '{' else ')'
                if char != expected:
                    print(f"Error: Mismatched '{last_open}' (line {last_line}) closed by '{char}' at line {i+1}")

    if stack:
        print(f"\nUnclosed blocks ({len(stack)}):")
        for char, line_num in stack:
            print(f"'{char}' opened at line {line_num}")

analyze_balance(r'C:\Users\pelissim\Documents\vulnx-ray\frontend\src\app\cve-search\page.tsx')
