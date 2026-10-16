const { execSync } = require('child_process');
const fs = require('fs');

async function testCheckout() {
  const cookieJar = new Map();
  function updateCookies(res) {
    const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
    for (const header of raw) {
      const parts = header.split(';');
      const [name, ...valParts] = parts[0].split('=');
      if (name) cookieJar.set(name.trim(), valParts.join('=').trim());
    }
  }
  function getCookieHeader() {
    return Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  }

  // 1. Clear cart
  await fetch('http://127.0.0.1:9292/cart/clear.js', { method: 'POST' });

  // 2. Add 1 item
  let res = await fetch('http://127.0.0.1:9292/cart/add.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 50203757838586, quantity: 1 })
  });
  updateCookies(res);

  // 3. Update discount FIRST200 on cart
  res = await fetch('http://127.0.0.1:9292/cart/update.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': getCookieHeader() },
    body: JSON.stringify({ discount: 'FIRST200' })
  });
  updateCookies(res);
  const cart = await res.json();
  console.log('Cart discount_codes:', cart.discount_codes);
  console.log('Cart total_discount:', cart.total_discount);

  // 4. Get checkout URL
  res = await fetch('http://127.0.0.1:9292/checkout', {
    headers: { 'Cookie': getCookieHeader() },
    redirect: 'manual'
  });
  let checkoutUrl = res.headers.get('location');
  console.log('Redirect checkout URL:', checkoutUrl);

  const chromePath = '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"';
  const cmd = `${chromePath} --headless=new --dump-dom "${checkoutUrl}"`;
  console.log('Running cmd...');
  const out = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  fs.writeFileSync('checkout_dom.html', out);
  console.log('Length:', out.length);
  console.log('Has FIRST200:', out.includes('FIRST200'));
  console.log('Has 200.00:', out.includes('200.00') || out.includes('200'));

  // Look for discount tags / lines
  const lines = out.split('\n').filter(l => l.includes('FIRST200') || l.includes('discount') || l.includes('reduction'));
  console.log('Found matching lines:', lines.slice(0, 5));
}

testCheckout().catch(console.error);
