"""Local interaction regression tests.
This container blocks navigation and WebGL. The exact source modules are inlined
into Chromium; its real Canvas 3D fallback is exercised. Browser storage is an
in-memory shim. Network delivery, service workers and real device GPU behavior
are NOT covered by this test. Core save migration is tested separately in Node.
"""
import json, os, time
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_helpers import inline_html, launch
OUT=Path(__file__).resolve().parents[1]/'artifacts'
OUT.mkdir(parents=True,exist_ok=True)
checks=[]
MODE=os.environ.get('TEST_GROUP','all')
def ok(name,condition=True):
    assert condition,name
    checks.append({'check':name,'result':'PASS'});print(round(time.monotonic(),1),'PASS',name,flush=True)
def snap(page):return page.evaluate('__WILDS_TEST__.snapshot()')
def settle(page):page.wait_for_function('!__WILDS_TEST__.snapshot().battle?.busy',timeout=10000)

def run():
 with sync_playwright() as p:
  browser=launch(p)
  for label,w,h,touch in ([] if MODE=='progression' else [('desktop',1440,1000,False),('phone',390,844,True),('small-phone',320,568,True),('landscape',844,390,True)]):
   page=browser.new_page(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch)
   page.set_default_timeout(6000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.set_content(inline_html());page.wait_for_function('document.body.dataset.mode==="intro"')
   box=page.locator('#start-btn').bounding_box()
   ok(f'{label}: start button fits viewport',box and box['x']>=0 and box['y']>=0 and box['x']+box['width']<=w+1 and box['y']+box['height']<=h+1)
   page.locator('.starter-option').nth(2).click();page.locator('#start-btn').click();page.wait_for_timeout(1000)
   ok(f'{label}: chosen starter starts adventure',snap(page)['state']['team'][0]['family']==2 and snap(page)['mode']=='explore')
   if touch:
    j=page.locator('#joystick').bounding_box();x=j['x']+j['width']/2;y=j['y']+j['height']/2
    before=snap(page)['state']['position']
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+30,y-20);page.wait_for_timeout(400);page.mouse.up();page.wait_for_timeout(250)
    after=snap(page)['state']['position'];ok(f'{label}: held joystick moves player',after!=before)
   page.evaluate('__WILDS_TEST__.encounter(3,4,0)');page.wait_for_timeout(1400)
   box=page.locator('#capture-btn').bounding_box()
   ok(f'{label}: battle action is reachable',box and 0<=box['x'] and box['x']+box['width']<=w+1 and box['y']+box['height']<=h+1)
   page.evaluate('__WILDS_TEST__.pauseRendering(true)');page.wait_for_timeout(120)
   page.screenshot(path=str(OUT/f'battle-{label}.png'),timeout=6000)
   page.evaluate('__WILDS_TEST__.pauseRendering(false)')
   page.locator('#run-btn').click();ok(f'{label}: leave battle returns control',snap(page)['mode']=='explore')
   ok(f'{label}: no JavaScript runtime errors',not errors)
   page.close()
  if MODE=='layout':
   browser.close();return {'checks':checks,'passed':len(checks),'failed':0,'environment':'Chromium software 3D, four viewports'}
  page=browser.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
  page.set_default_timeout(6000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(inline_html());page.wait_for_function('document.body.dataset.mode==="intro"')
  page.locator('#start-btn').click();page.wait_for_timeout(900)
  before=snap(page)['state']['position'];page.keyboard.down('w');page.wait_for_timeout(450);page.keyboard.up('w');after=snap(page)['state']['position']
  ok('keyboard movement changes position',before!=after)
  page.locator('#team-btn').click();before=snap(page)['state']['position'];page.keyboard.down('w');page.wait_for_timeout(250);page.keyboard.up('w')
  ok('team overlay suspends movement',snap(page)['state']['position']==before);page.locator('#close-team').click()
  page.evaluate('__WILDS_TEST__.teleport(4,4)');page.wait_for_timeout(350);page.locator('#interact-btn').click()
  ok('roaming creature can be encountered without debug encounter command',snap(page)['mode']=='battle')
  page.evaluate('__WILDS_TEST__.setRoll(.5)');before=snap(page);page.locator('#strike-btn').click();page.locator('#strike-btn').dispatch_event('click');settle(page);after=snap(page)
  ok('quick strike damages opponent',after['battle']['opponent']['hp']<before['battle']['opponent']['hp'])
  ok('opponent counters and damages ally',after['state']['team'][0]['hp']<before['state']['team'][0]['hp'])
  ok('rapid duplicate taps cannot take duplicate turns',after['battle']['turn']==1)
  ok('quick strike unlocks charged signature move',not page.locator('#special-btn').is_disabled())
  page.locator('#heal-btn').click();settle(page);ok('healing consumes exactly one potion',snap(page)['state']['potions']==4)
  page.evaluate('__WILDS_TEST__.setRoll(0)');before=snap(page)['state'];page.locator('#capture-btn').click();settle(page);after=snap(page)['state']
  ok('capture adds companion',len(after['team'])==len(before['team'])+1)
  ok('capture consumes one orb',after['orbs']==before['orbs']-1)
  page.locator('#capture-btn').dispatch_event('click');ok('completed capture cannot be repeated',len(snap(page)['state']['team'])==len(after['team']))
  page.locator('#battle-continue').click();page.locator('#team-btn').click();page.get_by_role('button',name='Make lead',exact=True).click();ok('captured companion can become lead',snap(page)['state']['active']==1);page.locator('#close-team').click()
  page.evaluate('__WILDS_TEST__.orbs(0);__WILDS_TEST__.encounter(1,3,0)');ok('zero orbs disables capture',page.locator('#capture-btn').is_disabled());page.locator('#run-btn').click();page.locator('#camp-btn').click();s=snap(page)['state'];ok('camp heals and replenishes supplies',s['orbs']>=12 and s['potions']>=5 and all(m['hp']>0 for m in s['team']))
  page.evaluate('__WILDS_TEST__.xp(1000)');page.locator('#team-btn').click();page.get_by_role('button',name='Evolve',exact=True).first.click();page.locator('#evolution-btn').click();page.wait_for_function('__WILDS_TEST__.snapshot().state.team[1].stage===1');page.wait_for_timeout(1400)
  ok('first animated evolution changes the creature',snap(page)['state']['team'][1]['stage']==1)
  page.evaluate('__WILDS_TEST__.pauseRendering(true)');page.wait_for_timeout(120);page.screenshot(path=str(OUT/'evolution-first-phone.png'),timeout=6000);page.evaluate('__WILDS_TEST__.pauseRendering(false)');page.locator('#evolution-btn').click();page.locator('#team-btn').click();page.get_by_role('button',name='Evolve',exact=True).first.click();page.locator('#evolution-btn').click();page.wait_for_function('__WILDS_TEST__.snapshot().state.team[1].stage===2');page.wait_for_timeout(1400)
  ok('second animated evolution reaches final form',snap(page)['state']['team'][1]['stage']==2);page.evaluate('__WILDS_TEST__.pauseRendering(true)');page.wait_for_timeout(120);page.screenshot(path=str(OUT/'evolution-final-phone.png'),timeout=6000);page.evaluate('__WILDS_TEST__.pauseRendering(false)');page.locator('#evolution-btn').click()
  page.evaluate('for(const m of __WILDS_TEST__.state().team)m.hp=1;__WILDS_TEST__.encounter(0,50,2)');page.locator('#strike-btn').click();settle(page)
  ok('a healthy teammate automatically replaces a fainted lead',snap(page)['state']['active']==0 and snap(page)['mode']=='battle')
  page.locator('#strike-btn').click();settle(page);ok('fully fainted team ends battle cleanly',snap(page)['mode']=='result' and snap(page)['battle']['result']=='lost');page.locator('#battle-continue').click()
  ok('loss recovery restores team at camp',snap(page)['mode']=='explore' and all(m['hp']>0 for m in snap(page)['state']['team']))
  page.evaluate('__WILDS_TEST__.state().team[0].level=50;__WILDS_TEST__.state().team[0].stage=2;__WILDS_TEST__.state().team[0].hp=400;__WILDS_TEST__.setRoll(.5)')
  for guardian in range(3):
   page.evaluate(f'__WILDS_TEST__.guardian({guardian})');ok(f'guardian {guardian+1}: capture is unavailable',page.locator('#capture-btn').is_disabled())
   for _ in range(10):
    if snap(page)['mode']=='result':break
    page.locator('#special-btn' if not page.locator('#special-btn').is_disabled() else '#strike-btn').click();settle(page)
   ok(f'guardian {guardian+1}: victory awards its sigil',guardian in snap(page)['state']['badges']);page.locator('#battle-continue').click()
  ok('all three sigils complete the main quest','Guardian of the wilds' in page.locator('#quest-title').inner_text())
  page.evaluate("() => { localStorage.setItem=()=>{throw new Error('Quota exceeded')}; }")
  page.locator('#camp-btn').click();page.locator('#help-btn').click();ok('storage failure does not stop play and is disclosed','unavailable' in page.locator('#save-note').inner_text());page.locator('#close-help').click()
  ok('full progression run has no JavaScript runtime errors',not errors)
  page.close();browser.close()
 return {'checks':checks,'passed':len(checks),'failed':0,'environment':'Chromium 144, software 3D renderer, four emulated viewports, in-memory storage shim','not_tested':['WebGL rendering on a physical GPU','Safari/iOS physical devices','network navigation and real service-worker delivery','actual browser persistent storage across navigation']}

if __name__=='__main__':
 try:
  report=run();(OUT/f'browser-results-{MODE}.json').write_text(json.dumps(report,indent=2));print(json.dumps({'passed':report['passed'],'failed':0,'environment':report['environment']},indent=2))
 except Exception as e:
  (OUT/f'browser-results-{MODE}.json').write_text(json.dumps({'checks':checks,'failed':str(e)},indent=2));raise
