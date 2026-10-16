const fs = require('fs');

async function test() {
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

  // 1. Clear & Add 1 item
  await fetch('http://127.0.0.1:9292/cart/clear.js', { method: 'POST' });
  let res = await fetch('http://127.0.0.1:9292/cart/add.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 50203757838586, quantity: 1 })
  });
  updateCookies(res);

  // Apply discount FIRST200
  res = await fetch('http://127.0.0.1:9292/cart/update.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': getCookieHeader() },
    body: JSON.stringify({ discount: 'FIRST200' })
  });
  updateCookies(res);
  const cartJson = await res.json();
  console.log('Cart update JSON:', {
    item_count: cartJson.item_count,
    total_discount: cartJson.total_discount,
    discount_codes: cartJson.discount_codes
  });

  // Also hit /discount/FIRST200
  res = await fetch('http://127.0.0.1:9292/discount/FIRST200', {
    headers: { 'Cookie': getCookieHeader() },
    redirect: 'manual'
  });
  updateCookies(res);
  console.log('Discount endpoint status:', res.status, 'Location:', res.headers.get('location'));

  // Now hit /checkout
  res = await fetch('http://127.0.0.1:9292/checkout', {
    headers: { 'Cookie': getCookieHeader() },
    redirect: 'manual'
  });
  updateCookies(res);
  let checkoutLocation = res.headers.get('location');
  console.log('Checkout location:', checkoutLocation);

  // If redirecting, follow redirects
  while (checkoutLocation) {
    res = await fetch(checkoutLocation, {
      headers: { 'Cookie': getCookieHeader() },
      redirect: 'manual'
    });
    updateCookies(res);
    const nextLoc = res.headers.get('location');
    console.log('Next location:', nextLoc || 'None (200 OK)');
    if (!nextLoc) break;
    checkoutLocation = nextLoc;
  }

  const html = await res.text();
  fs.writeFileSync('checkout_sample.html', html);
  console.log('Saved checkout_sample.html, size:', html.length);
  console.log('Contains FIRST200:', html.includes('FIRST200'));
  console.log('Contains 200.00 or 200:', html.includes('200.00') || html.includes('₹200'));
  console.log('Cookies in jar:', Array.from(cookieJar.keys()));
}

test().catch(console.error);
