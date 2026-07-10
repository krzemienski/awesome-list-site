const form = document.querySelector('form');
const email = document.querySelector('input[type="email"], input[name="email"]');
const password = document.querySelector('input[type="password"]');
const submitBtn = Array.from(document.querySelectorAll('button')).find(b => /sign in|log in|continue/i.test(b.innerText));
JSON.stringify({form: !!form, email: !!email, password: !!password, submitBtn: submitBtn ? submitBtn.innerText : null, url: location.href}, null, 2);