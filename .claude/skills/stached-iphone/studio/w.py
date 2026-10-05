#!/usr/bin/env python3
"""One step on the iPhone, through WebDriverAgent on :8187 (see ../SKILL.md).

  labels                  what's on screen: type, label, center (points), value
  tap X Y                 tap a point (points: screenshot pixels / 3)
  click LABEL [i] [using] tap an element by label, or by "predicate string"
  type TEXT               type into whatever has focus
  shot NAME               screenshot to shots/NAME.png
  alert [text|accept|dismiss]
  addr                    Safari's full address (while its field is open)
  home | activate BUNDLE  the home screen, or bring an app forward
  source                  the raw UI tree
"""
import json, re, subprocess, sys, urllib.error, urllib.request
import xml.etree.ElementTree as ET

WDA = "http://127.0.0.1:8187"
UDID = open("/tmp/stached-sim/udid").read().strip()
SID = "/tmp/stached-sim/sid"


def call(method, path, body=None):
    req = urllib.request.Request(
        WDA + path, method=method, headers={"content-type": "application/json"},
        data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return json.load(e)


def session():
    try:
        s = open(SID).read().strip()
        if call("GET", f"/session/{s}/window/size").get("value", {}).get("width"):
            return s
    except FileNotFoundError:
        pass
    s = call("POST", "/session", {"capabilities": {"alwaysMatch": {}}})["value"]["sessionId"]
    open(SID, "w").write(s)
    return s


def tree(s):
    return ET.fromstring(call("GET", f"/session/{s}/source")["value"].encode()).iter()


cmd, *args = sys.argv[1:] or ["labels"]
s = session()
if cmd == "labels":
    for e in tree(s):
        a = e.attrib
        if a.get("visible") == "true" and a.get("accessible") == "true" and (a.get("label") or a.get("name")):
            x, y, w, h = (int(a[k]) for k in ("x", "y", "width", "height"))
            print(a["type"].replace("XCUIElementType", ""), repr(a.get("label") or a.get("name")),
                  f"@({x + w // 2},{y + h // 2})", repr(a.get("value", ""))[:40])
elif cmd == "tap":
    print(call("POST", f"/session/{s}/wda/tap", {"x": float(args[0]), "y": float(args[1])}).get("value"))
elif cmd == "click":
    using = args[2] if len(args) > 2 else "accessibility id"
    found = call("POST", f"/session/{s}/elements", {"using": using, "value": args[0]}).get("value", [])
    ids = [e["ELEMENT"] for e in found if isinstance(e, dict) and "ELEMENT" in e]
    i = int(args[1]) if len(args) > 1 else 0
    print(f"{len(ids)} found;", call("POST", f"/session/{s}/element/{ids[i]}/click", {}).get("value") if ids else "none")
elif cmd == "type":
    print(call("POST", f"/session/{s}/wda/keys", {"value": list(args[0])}).get("value"))
elif cmd == "shot":
    subprocess.run(["xcrun", "simctl", "io", UDID, "screenshot", f"/tmp/stached-sim/shots/{args[0]}.png"], capture_output=True)
    print("shot", args[0])
elif cmd == "alert":
    a = args[0] if args else "text"
    v = call("GET" if a == "text" else "POST", f"/session/{s}/alert/{a}", None if a == "text" else {}).get("value")
    print(v.get("error") if isinstance(v, dict) else v)
elif cmd == "addr":
    for e in tree(s):
        if e.attrib.get("name") == "URL" and e.attrib.get("type") == "XCUIElementTypeTextField":
            print(re.sub(r"handoff=[\w-]+", "handoff=<code>", e.attrib.get("value", "")))
elif cmd == "home":
    print(call("POST", "/wda/homescreen", {}).get("value"))
elif cmd == "activate":
    print(call("POST", f"/session/{s}/wda/apps/activate", {"bundleId": args[0]}).get("value"))
elif cmd == "source":
    print(call("GET", f"/session/{s}/source")["value"])
else:
    print(__doc__)
