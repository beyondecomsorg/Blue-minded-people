const fs = require('fs');

async function check() {
  const res = await fetch('http://127.0.0.1:9292/');
  const html = await res.text();
  const start = html.indexOf('cart-progress-bar__milestones');
  if (start !== -1) {
    console.log(html.substring(start - 20, start + 1200));
  } else {
    console.log('Not found');
  }
}

check().catch(console.error);
