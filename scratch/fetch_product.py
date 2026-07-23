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

# 2. Fetch collections/all
print("Fetching catalog...")
try:
    with urllib.request.urlopen(f"{url_base}/collections/all") as response:
        html = response.read().decode("utf-8")
    
    # Search for product links
    product_links = list(set(re.findall(r'/products/([a-zA-Z0-9\-_]+)', html)))
    print(f"Found {len(product_links)} products:")
    for handle in product_links:
        print(" -", handle)
        
except Exception as e:
    print(f"Error fetching catalog: {e}")
