import urllib.request
import urllib.parse
import re
import json

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

# 2. Fetch some product or sitemap
print("Fetching products sitemap...")
try:
    with urllib.request.urlopen(f"{url_base}/sitemap.xml") as response:
        sitemap = response.read().decode("utf-8")
    products = re.findall(r'<loc>(https?://[^/]+/products/[^<]+)</loc>', sitemap)
    print(f"Found {len(products)} products in sitemap:")
    for p in products[:15]:
        print(" -", p)
except Exception as e:
    print(f"Error fetching sitemap: {e}")
