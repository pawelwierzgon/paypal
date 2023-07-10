const express = require('express');
const braintree = require('braintree');
const cors = require('cors');
const app = express();
const port = 3000;
require('dotenv').config();

app.use(cors());
app.use(express.json());

const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.MERCHANT_ID,
  publicKey: process.env.PUBLIC_KEY,
  privateKey: process.env.PRIVATE_KEY
});

// Generate customer ID for 'test' user
app.get('/get-customer-id', (req, res) => {
  gateway.clientToken.generate({
    customerId: 'test'
  }, (err, response) => {
    const clientToken = response.clientToken
    res.send({
      token: clientToken
    })
  });
});

// Process the checkout with client nonce and hardcoded shopping cart
app.post('/checkout', (req, res) => {
  const nonceFromTheClient = req.body.nonce;
  gateway.transaction.sale({
    amount: '16.70',
    paymentMethodNonce: nonceFromTheClient,
    lineItems: [
      {
        quantity: '1',
        unitAmount: '10.00',
        name: 'Item 1',
        description: 'Description of item 1',
        kind: 'debit',
        totalAmount: '10.00'
      },
      {
        quantity: '1',
        unitAmount: '5.20',
        name: 'Item 2',
        description: 'Description of item 2',
        kind: 'debit',
        totalAmount: '10.00'
      },
      {
        quantity: '1',
        unitAmount: '1.50',
        name: 'Item 3',
        description: 'Description of item 3',
        kind: 'debit',
        totalAmount: '10.00'
      }
    ],
    options: {
      submitForSettlement: true
    }
  }, (err, result) => {
    if (result.success) {
      res.send({
        status: result.success,
        paymentId: result.transaction.paymentReceipt.id
      })
    } else {
      res.send({status: result.success});
    }
  });
});

// Refunding transactions
app.post('/refund', (req, res) => {
  gateway.transaction.search(search => {
    search.id().is(req.body.orderId);
  }, (err, response) => {
    response.each((err, transaction) => {
      // Refund if settled/settling
      if (transaction.status === 'settled' || transaction.status === 'settling') {
        gateway.transaction.refund(req.body.orderId, (err, result) => {
          res.send({success: result.success, message: result.message});
        });
      } else {
        // Void the transaction
        gateway.transaction.void(req.body.orderId, (err, result) => {
          res.send({success: result.success, message: result.message});
        });
      }
    });
  });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
});