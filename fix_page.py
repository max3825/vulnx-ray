
import os

filepath = r"C:\Users\pelissim\Documents\vulnx-ray\frontend\src\app\cve-search\page.tsx.bak"
output_path = r"C:\Users\pelissim\Documents\vulnx-ray\frontend\src\app\cve-search\page.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Operations in reverse order of line number (1-based)
ops = [
    # Remove junk lines
    {'action': 'pop', 'line': 620},
    {'action': 'pop', 'line': 619},
    
    # Close blocks
    {'action': 'insert', 'line': 557, 'content': '                            )}\n'},
    {'action': 'insert', 'line': 505, 'content': '                            )}\n'},
    {'action': 'insert', 'line': 499, 'content': '                            )}\n'},
    {'action': 'insert', 'line': 494, 'content': '                            )}\n'},
    
    # Insert Sidebar
    {'action': 'insert', 'line': 481, 'content': """                        
                        {/* Saved Searches Sidebar */}
                        {showSavedSearches && (
                            <div className="mt-4">
                                <SavedSearchesSidebar
                                    searches={savedSearches}
                                    onLoad={handleLoadSearch}
                                    onDelete={handleDeleteSearch}
                                    onToggleFavorite={handleToggleFavorite}
                                />
                            </div>
                        )}
"""},
    
    # Insert History Button
    {'action': 'insert', 'line': 480, 'content': """                            <button
                                onClick={() => setShowSavedSearches(!showSavedSearches)}
                                className={`px-6 py-4 transition-all rounded-lg font-bold flex items-center justify-center gap-2 text-lg ${showSavedSearches 
                                    ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]' 
                                    : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-purple-500/30'}`}
                                title={showSavedSearches ? "Hide saved searches" : "View saved searches"}
                            >
                                <History className="w-5 h-5" />
                            </button>
"""}
]

# Sort ops by line descending
ops.sort(key=lambda x: x['line'], reverse=True)

for op in ops:
    idx = op['line'] - 1 # Convert to 0-based index
    if op['action'] == 'pop':
        # Verify content
        print(f"Removing line {op['line']}: {lines[idx].strip()}")
        lines.pop(idx)
    elif op['action'] == 'insert':
        print(f"Inserting after line {op['line']}")
        # Insert AFTER the line, so index + 1
        lines.insert(idx + 1, op['content'])

with open(output_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Done.")
