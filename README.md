Bitcoin-express payment library  &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)]
==========================================

* Licence: [MIT Licence](https://raw.githubusercontent.com/bitcoin-express/BitcoinExpress/master/LICENSE.md)
* Authors: [Jose E. Martinez](https://github.com/jootse84), [Ricky Rand](https://github.com/rickycrand)
* Contributers: Paul Clark, Jon Barber, Clive Rand
* Language: Javascript
* Homepage: https://bitcoin-e.org/


Getting started
===============

Bitcoin-express payment library allows your website to open one of the Bitcoin wallets from the list of wellKnownWallets defined in the library.
The BitcoinExpress container will first allow the user to select their wallet and then launch it.

In addition, the library allows requests to a wallet to authorise payments. If the user confirms the payment, coins coming from the user payment will be sent  for verification.

BitcoinExpress is a vanilla javascript library. You need to make use of [Gulp task manager](https://gulpjs.com/) in order to build your own modified library.

Check out the code from Github:
```shellscript
    git clone git@github.com:bitcoin-express/BitcoinExpress.git
    cd BitcoinExpress
```

Install all the development dependencies of the project:
```shellscript
    npm install
```

Build library (developer mode).
```shellscript
    gulp build:dev
```

Build production library (removes logs in console and minifies the file, renaming it to *BitcoinExpress.min.js*).
```shellscript
    gulp
```

Set your own list of well known wallets
=======================================

From *gulpfile.js* modify the list of probes (dev - development built library / dist - production built library) with the wallets you desire to use for your own built library.


Fow to use the library?
=======================

Include the library in your website:
```
  <script type="text/javascript" src="BitcoinExpress.min.js"></script>
```

Open a wallet?
```javascript
  // if fullScreen set to false, wallet will
  // open with the minimized version
  BitcoinExpress.Wallet.Open({
    fullScreen: true
  });
```

Request a payment?
```javascript
var payReq = {
  fullScreen: false,
  PaymentRequest: {
    payment_details_version: "1",
    PaymentDetails: {
      payment_url: "your_payment_url",
      currency: "XBT",
      issuers: ["*.rmp.net","coinbase.com"],
      amount: 0.0000123,
      memo: "Your product to sell's name",
      email: {
        contact: "sales@merchant.com",
        receipt: true,
        refund: false
      },
      time: "2017-06-01T00:00:00Z",
      expires: "2017-12-31T00:00:00Z"
    }
  }
}

BitcoinExpress.Wallet.Open(copyReq).then(function(response) {
  if ("PaymentAck" in response) {
    var PaymentAck = response.PaymentAck;
    if ("status" in PaymentAck) {
      console.log("Status is " + PaymentAck.status);
      if (PaymentAck.status == "ok" && "return_url" in PaymentAck) {
        // Redirect and display in browser the item bought
        return window.location.replace(PaymentAck.return_url);
      }
    }
  }
}).catch(function(err) {
  console.log("PaymentRequest error", err);
});
```
