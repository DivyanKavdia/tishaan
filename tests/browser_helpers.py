from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]/'games'/'monterra'

def inline_html():
    html=(ROOT/'index.html').read_text()
    html=re.sub(r'<link rel="stylesheet"[^>]*>', '<style>'+(ROOT/'wilds.css').read_text()+'</style>',html)
    code='\n'.join(re.sub(r'^import .*?;\s*$', '', (ROOT/name).read_text(), flags=re.M).replace('export ','') for name in ['engine.js','core.js','creatures.js','world.js','game.js'])
    code=code.replace("if(['localhost','127.0.0.1'].includes(location.hostname))",'if(true)')
    storage="""const __store=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>__store.get(k)||null,setItem:(k,v)=>__store.set(k,String(v)),removeItem:k=>__store.delete(k)}});"""
    return re.sub(r'<script type="module"[^>]*></script>', lambda m:'<script type="module">'+storage+code+'</script>',html)

def launch(p):
    return p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
