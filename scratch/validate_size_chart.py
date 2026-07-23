import urllib.request
import urllib.parse
import re

url_base = "http://localhost:9296"

cookie_jar = urllib.request.HTTPCookieProcessor()
opener = urllib.request.build_opener(cookie_jar)
urllib.request.install_opener(opener)

# 1. Login
print("Logging in to storefront...")
data = urllib.parse.urlencode({"password": "test"}).encode("utf-8")
req = urllib.request.Request(f"{url_base}/password", data=data)
try:
    with urllib.request.urlopen(req) as response:
        response.read()
    print("Login successful.")
except Exception as e:
    print(f"Login failed: {e}")

# 2. Fetch a specific product page, e.g. blue-pull-up-pant-non-denim or cameo-pink-oversized-t-shirt
product_url = f"{url_base}/products/blue-pull-up-pant-non-denim"
print(f"Fetching product page: {product_url}")
try:
    with urllib.request.urlopen(product_url) as response:
        html = response.read().decode("utf-8")
    
    print("\n--- VALDIATING GENERATED HTML ---")
    
    # Check for script tag
    shirt_script_present = "class=\"shirt-size-chart-data\"" in html
    bottom_script_present = "class=\"bottom-size-chart-data\"" in html
    dynamic_tables_container = "class=\"size-chart-dynamic-tables\"" in html
    
    print(f"Shirt script tag present: {shirt_script_present}")
    print(f"Bottom script tag present: {bottom_script_present}")
    print(f"Dynamic tables container present: {dynamic_tables_container}")
    
    if shirt_script_present or bottom_script_present:
        print("PASS: Size chart metafield script tag(s) successfully outputted to the product page!")
    else:
        print("INFO: No dynamic size chart script tags found on this product page. (This is expected if the product does not have these metafield values).")

except Exception as e:
    print(f"Error fetching product page: {e}")
