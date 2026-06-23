import urllib.request
import urllib.parse
import re

url_base = "http://localhost:9293"

# Create a cookie processor to maintain the session
cookie_jar = urllib.request.HTTPCookieProcessor()
opener = urllib.request.build_opener(cookie_jar)
urllib.request.install_opener(opener)

# 1. Post password to /password
print("Logging into storefront...")
data = urllib.parse.urlencode({"password": "test"}).encode("utf-8")
req = urllib.request.Request(f"{url_base}/password", data=data)
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode("utf-8")
        print("Login request completed.")
except Exception as e:
    print(f"Error logging in: {e}")

# 2. Fetch homepage
print("Fetching homepage...")
try:
    with urllib.request.urlopen(f"{url_base}/") as response:
        html = response.read().decode("utf-8")
        print("Homepage fetched successfully.")
        
        # Search for header-component
        header_match = re.search(r'(<header-component.*?</header-component>)', html, re.DOTALL)
        if header_match:
            header_html = header_match.group(1)
            print("\n--- FOUND HEADER-COMPONENT ---")
            # Print first 2000 chars of header html
            print(header_html[:5000])
            print("------------------------------\n")
            
            # Check if header-menu is present inside
            if "header-menu" in header_html:
                print("SUCCESS: header-menu is present in the HTML.")
            else:
                print("WARNING: header-menu is NOT present in the HTML.")
        else:
            print("ERROR: header-component not found in HTML.")
except Exception as e:
    print(f"Error fetching homepage: {e}")
