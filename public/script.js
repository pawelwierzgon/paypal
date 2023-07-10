// Fetch functions
async function fetchAsyncGet(url) {
  let response = await fetch('https://paypal-delta.vercel.app/' + url);
  let data = await response.json();
  return data;
}
  
async function fetchAsyncPost(url, body) {
  let response = await fetch('https://paypal-delta.vercel.app/' + url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  let data = await response.json();
  return data;
}

let signInBtn = document.querySelector('#sign-in-btn');
let purchaseBtn = document.querySelector('#purchase-btn');
let hiddenDiv = document.querySelector('#hidden');
let refundBtn = document.querySelector('#refund-btn');
let errorMsg = document.querySelector('#error-msg');
let dropinInstance = null;

// Fake signing-in and get the clientId
signInBtn.addEventListener('click', () => {
  signInBtn.disabled = true;
  fetchAsyncGet('get-customer-id').then(res => {
    if (res.token) {
      hiddenDiv.style = 'display: flex';
      signInBtn.style = 'display: none';

      braintree.dropin.create(
        {
          authorization: res.token,
          container: '#dropin-container',
          paypal: {
            flow: 'vault',
            intent: 'capture'
          }
        }, (err, instance) => {
          if (err) {
            errorMsg.textContent = err;
            return;
          } else {
            purchaseBtn.style = 'display: block';
            dropinInstance = instance;
          }
        }
      );
    } else {
      errorMsg.textContent = 'Login Failed';
      signInBtn.disabled = false;
    }
  });
});

// Purchase
purchaseBtn.addEventListener('click', () => {
  purchaseBtn.disabled = true;
  dropinInstance.requestPaymentMethod((err, payload) => {
    if (err) {
      errorMsg.textContent = err;
      purchaseBtn.disabled = false;
      return;
    }
    // Send payload.nonce to server
    fetchAsyncPost('checkout', {nonce: payload.nonce}).then(res => {
      if (res.status) {
        document.querySelector('#order-id').textContent = res.paymentId;
        document.querySelector('#refund-btn').dataset.orderId = res.paymentId;
        document.querySelector('#order').style = 'display: none';
        document.querySelector('#refund').style = 'display: flex';
      } else {
        errorMsg.textContent = res.message;
      }
    });
  });
});

// Refund
refundBtn.addEventListener('click', () => {
  refundBtn.disabled = true;
  errorMsg.textContent = '';
  fetchAsyncPost('refund', {orderId: refundBtn.dataset.orderId}).then(res => {
    if (res.success) {
      errorMsg.textContent = 'Refund successful!';
      refundBtn.style = 'display: none';
    } else {
      refundBtn.disabled = false;
      errorMsg.textContent = res.message;
    }
  })
})