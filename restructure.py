"""Move backend and frontend files into their own directories."""
import os, shutil

ROOT = r'c:\Users\User\OneDrive\Documenten - Waterbeheer\Software\Digital Dagstaat\nieuwe_site_tryout'

def mv(src, dst):
    src_path = os.path.join(ROOT, src)
    dst_path = os.path.join(ROOT, dst)
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    shutil.move(src_path, dst_path)
    print(f'  {src} -> {dst}')

# ── backend ───────────────────────────────────────────────────────────────
for item in ['server.js', 'db.js']:
    mv(item, f'backend/{item}')

for folder in ['middleware', 'routes', 'repositories']:
    src = os.path.join(ROOT, folder)
    dst = os.path.join(ROOT, 'backend', folder)
    shutil.move(src, dst)
    print(f'  {folder}/ -> backend/{folder}/')

# ── frontend ──────────────────────────────────────────────────────────────
for folder in ['js', 'partials']:
    src = os.path.join(ROOT, 'public', folder)
    dst = os.path.join(ROOT, 'frontend', folder)
    shutil.move(src, dst)
    print(f'  public/{folder}/ -> frontend/{folder}/')

# Remove leftover public/ (old index.html, no longer used)
pub = os.path.join(ROOT, 'public')
if os.path.isdir(pub):
    shutil.rmtree(pub)
    print('  removed public/')

print('\nDone.')
