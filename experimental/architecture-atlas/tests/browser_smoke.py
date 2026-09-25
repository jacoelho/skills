#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["playwright==1.57.0"]
# ///
"""Browser acceptance checks for the bundled example. Requires Playwright.

Default: open the HTML using file://. --mode memory is an explicit fallback for
managed environments that prohibit file navigation; it does NOT test delivery.
"""
from __future__ import annotations
import argparse
import json
import hashlib
import sys
import shutil
from pathlib import Path


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('html',type=Path)
    parser.add_argument('--mode',choices=['file','memory'],default='file')
    parser.add_argument('--browser',default=shutil.which('chromium'))
    parser.add_argument('--output',type=Path,default=Path('browser-report'))
    args=parser.parse_args()
    report={"status":"failed","mode":args.mode,"checks":[],"errors":[],
            "runtime_network_requests":[],"visual_review":"not_run",
            "limits":["One supplied example, not a corpus benchmark.",
                      "No manual screen-reader audit or non-Chromium browser test."]}
    if args.mode=="memory":
        report["limits"].append("In-memory DOM loading used; file:// and server delivery not validated in this run.")
    args.output.mkdir(parents=True,exist_ok=True)
    # Remove only this checker's fixed sidecars; never present old screenshots as current.
    for name in ("overview.png","data.png","scenario.png","mobile.png","browser-results.json"):
        (args.output/name).unlink(missing_ok=True)
    try:
        raw=args.html.read_bytes()
        report["artifact"]={"sha256":hashlib.sha256(raw).hexdigest(),"bytes":len(raw)}
        run_checks(args,raw.decode("utf-8"),report)
    except Exception as exc:
        report["errors"].append(type(exc).__name__+": "+str(exc))
    report["passed"]=len(report["checks"])
    (args.output/"browser-results.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps(report,indent=2))
    return 0 if report["status"]=="passed" else 1


def run_checks(args,content,report):
    from playwright.sync_api import sync_playwright
    checks=report["checks"];errors=report["errors"];network=report["runtime_network_requests"]
    def passed(name):checks.append(name)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=args.browser,headless=True,args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1440,'height':1000},offline=True)
        page=context.new_page()
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http:','https:','ws:','wss:')) else None)
        def load(page,html=content):
            if args.mode=='file' and html==content:page.goto(args.html.resolve().as_uri())
            else:page.set_content(html,wait_until='load')
        load(page)
        model=page.locator('#atlas-model').text_content();model=json.loads(model)
        def route(value):
            page.evaluate('(value)=>{location.hash=value}',value)
            page.wait_for_function('(v)=>new URLSearchParams(location.hash.slice(1)).get("view")===v',arg=value.split('&')[0].split('=')[1])
            page.wait_for_timeout(50)
        def title(value):assert page.locator('#viewtitle').text_content()==value
        title('Overview: instructions, artifact and checks');passed('initial overview renders')
        # Every view renders at all specified widths with no outer horizontal scroll.
        for width in [1440,1024,390]:
            page.set_viewport_size({'width':width,'height':1000 if width>390 else 844})
            for view in model['views']:
                route('view='+view['id'])
                title(view['title'])
                assert page.locator('#diagram svg').count()==1
                assert page.locator('#diagram [data-entity]').count()==len(view['entities'])
                assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
            passed(f'all six views render without page overflow at {width}px')
        page.set_viewport_size({'width':1440,'height':1000})
        route('view=overview')
        page.locator('#diagram [data-entity="validator"]').click()
        page.wait_for_timeout(50)
        assert page.locator('#inspector h3').text_content()=='HTML validator CLI'
        assert page.locator('#inspector a.source').count()>0
        passed('node selection exposes evidence')
        page.locator('#inspector button').filter(has_text='Executable validator: control and data flow').click()
        page.wait_for_timeout(50)
        title('Executable validator: control and data flow')
        passed('component drill-down')
        route('view=validator-flow&entity=result')
        page.locator('#inspector button').filter(has_text='Validator data structures and ownership').click()
        page.wait_for_timeout(50)
        assert 'entity=result' in page.url
        assert 'errors: list[str]' in page.locator('#inspector').text_content()
        assert 'warnings: list[str]' in page.locator('#inspector').text_content()
        passed('lens switch preserves selected entity and exposes fields')
        page.go_back();page.wait_for_timeout(50)
        title('Executable validator: control and data flow')
        passed('browser Back restores prior view')
        route('view=validator-data')
        node=page.locator('#diagram [data-entity="matches"]')
        node.focus();page.keyboard.press('Enter');page.wait_for_timeout(50)
        assert page.locator('#inspector h3').text_content()=='matches(pattern, text)'
        edge=page.locator('#diagram [data-relation="matches-result"]')
        edge.focus();page.keyboard.press('Enter');page.wait_for_timeout(50)
        assert page.locator('#inspector h3').text_content()=='Caller interprets bool'
        passed('keyboard selects nodes and edges')
        route('view=overview')
        page.locator('#search').fill('warnings')
        assert page.locator('#searchresults button').count()>0
        passed('search indexes data fields')
        for sc in model['scenarios']:
            route('view=validator-flow&scenario='+sc['id']+'&step=-1')
            state=dict(sc['initial'])
            for step in sc['steps']:
                page.locator('#next').click();page.wait_for_timeout(50)
                state.update(step.get('set',{}))
                assert json.loads(page.locator('#currentstate').text_content())==state
            final=page.locator('#currentstate').text_content()
            page.locator('#prev').click();page.wait_for_timeout(50)
            page.locator('#next').click();page.wait_for_timeout(50)
            assert page.locator('#currentstate').text_content()==final
            page.locator('#reset').click();page.wait_for_timeout(50)
            assert json.loads(page.locator('#currentstate').text_content())==sc['initial']
        passed('all three scenarios, backward replay and reset match declared snapshots')
        # Changing scenario while playing cancels old work.
        page.locator('#play').click()
        assert page.locator('#play').text_content()=='Pause'
        page.locator('#scenarioselect').select_option('external-script');page.wait_for_timeout(1950)
        assert page.locator('#progress').text_content()=='Initial state'
        passed('scenario change cancels playback')
        page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(50)
        assert page.locator('#play').is_disabled()
        assert page.locator('#next').is_enabled()
        page.locator('#next').click();page.wait_for_timeout(50)
        assert json.loads(page.locator('#currentstate').text_content())['decoded'] is True
        passed('reduced motion preserves manual stepping and disables autoplay')
        # Labels and summaries remain inert; never interpreted as markup.
        malicious=content.replace('Start with the authoring contract', '&lt;img src=x onerror=window.INJECTED=true&gt; Start with the authoring contract',1)
        other=context.new_page();load(other,malicious)
        assert not other.evaluate('Boolean(window.INJECTED)')
        other.close();passed('escaped prose remains text')
        page.emulate_media(reduced_motion='no-preference')
        for name,hashvalue in [('overview','view=overview'),('data','view=validator-data&entity=result'),('scenario','view=validator-flow&scenario=comment-pass&step=5')]:
            route(hashvalue)
            page.screenshot(path=str(args.output/(name+'.png')),full_page=True)
        page.set_viewport_size({'width':390,'height':844})
        route('view=validator-data&entity=result')
        page.screenshot(path=str(args.output/'mobile.png'),full_page=True)
        nojs=browser.new_context(java_script_enabled=False)
        bare=nojs.new_page();load(bare)
        assert bare.locator('h1').text_content()=='Inside visualize-architecture-flow'
        assert 'JavaScript is needed' in bare.locator('noscript').text_content()
        nojs.close();passed('no-JavaScript overview and explanation visible')
        assert errors==[],errors
        assert network==[],network
        passed('zero console/page errors and zero runtime network requests')
        report.update(browser=browser.version, status="passed", visual_review="not_run")
        browser.close()


if __name__=="__main__":sys.exit(main())
