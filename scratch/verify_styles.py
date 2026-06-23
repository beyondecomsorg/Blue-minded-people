import urllib.request
import urllib.parse
import re

url_base = "http://localhost:9293"

# 1. Login to Shopify storefront
print("Logging into storefront...")
data = urllib.parse.urlencode({"password": "test"}).encode("utf-8")
req = urllib.request.Request(f"{url_base}/password", data=data)

try:
    # Use cookie processor to maintain login state
    cookie_jar = urllib.request.HTTPCookieProcessor()
    opener = urllib.request.build_opener(cookie_jar)
    urllib.request.install_opener(opener)
    
    with urllib.request.urlopen(req) as response:
        response.read()
    print("Login successful.")
except Exception as e:
    print(f"Login failed: {e}")

# 2. Fetch homepage source
print("Fetching homepage HTML...")
try:
    with urllib.request.urlopen(f"{url_base}/") as response:
        html = response.read().decode("utf-8")
    print("Homepage HTML retrieved successfully.")
    
    # 3. Check for specific override properties
    checks = {
        "Canela font-face Light": "Canela-Light.woff2",
        "Canela font-face Regular": "Canela-Regular.woff2",
        "Canela font-face Medium": "Canela-Medium.woff2",
        "CSS Variable --font-heading": "--font-heading: 'Canela', 'Freight Display', Georgia, serif;",
        "CSS Variable --font-body": "--font-body: 'Inter', system-ui, sans-serif;",
        "Header logo text override": ".header__logo-text, .header__logo a, .logo-text, .header-wordmark",
        "About Us stats strong override": ".wau-stat-pill strong",
        "Rotating banner override": ".war-static, .war-word",
        "Trust strip override": ".trust-strip, .trust-strip *",
        "Custom footer override": ".custom-footer, .custom-footer *"
    }
    
    print("\n--- AUDITING INJECTED STYLES ---")
    all_passed = True
    for name, pattern in checks.items():
        if pattern in html:
            print(f"[PASS] {name} is present in the document.")
        else:
            print(f"[FAIL] {name} NOT found in the document!")
            all_passed = False
            
    if all_passed:
        print("\nSUCCESS: All typography override selectors are successfully rendered in layout/theme.liquid style tag.")
    else:
        print("\nWARNING: Some override elements were missing in the rendered HTML.")
        
except Exception as e:
    print(f"Error checking storefront HTML: {e}")
