import urllib.request
import urllib.parse
import re

url_base = "http://localhost:9296"

cookie_jar = urllib.request.HTTPCookieProcessor()
opener = urllib.request.build_opener(cookie_jar)
urllib.request.install_opener(opener)

# 1. Login
print("Logging in...")
data = urllib.parse.urlencode({"password": "test"}).encode("utf-8")
req = urllib.request.Request(f"{url_base}/password", data=data)
try:
    with urllib.request.urlopen(req) as response:
        response.read()
    print("Login successful.")
except Exception as e:
    print(f"Login failed: {e}")

# Product list
products = [
  "brown-pull-up-pant-jeans",
  "cameo-pink-oversized-t-shirt",
  "oil-green-oversized-t-shirt",
  "indigo-borris-slim-jeans-copy-3",
  "indigo-borris-slim-jeans-2",
  "indigo-borris-slim-jeans-copy-2",
  "black-oversized-t-shirt",
  "white-pull-up-pant-jeans",
  "indigo-borris-slim-jeans-3",
  "indigo-borris-slim-jeans-copy-1",
  "black-pull-up-pant-non-denim",
  "grey-mutant-marco-jeans",
  "grey-mutant-marco-jeans-2",
  "grey-pull-up-pant-jeans",
  "indigo-borris-slim-jeans-copy",
  "chocolate-brown-oversized-t-shirt",
  "charcoal-grey-borris-slim-jeans",
  "dusk-oversized-t-shirt",
  "cavernous-oversized-t-shirt",
  "pale-khaki-oversized-t-shirt",
  "indigo-borris-slim-jeans",
  "blue-pull-up-pant-non-denim",
  "indigo-borris-slim-jeans-1",
  "grey-mutant-marco-jeans-1"
]

print("Scanning products for dynamic size chart data...")
for handle in products:
    url = f"{url_base}/products/{handle}"
    try:
        with urllib.request.urlopen(url) as response:
            html = response.read().decode("utf-8")
        
        shirt = "class=\"shirt-size-chart-data\"" in html
        bottom = "class=\"bottom-size-chart-data\"" in html
        
        if shirt or bottom:
            print(f"[FOUND] Product: {handle} | Shirt: {shirt} | Bottom: {bottom}")
    except Exception as e:
        print(f"Error checking {handle}: {e}")

print("Scan complete.")
