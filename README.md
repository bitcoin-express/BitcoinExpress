<h1 align="center">
  <br>
  <img width=20% src="https://bitcoin-e.org/css/img/Bitcoin-express.png">
  <br>
  BitcoinExpress
  <br>

</h1>

Bitcoin-express payment library 
![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)

* Licence: [MIT Licence](https://raw.githubusercontent.com/bitcoin-express/BitcoinExpress/master/LICENSE.md)
* Authors: [Jose E. Martinez](https://github.com/jootse84), [Ricky Rand](https://github.com/rickycrand)
* Contributers: Paul Clark, Jon Barber, Clive Rand
* Language: Javascript
* Homepage: https://bitcoin-e.org/


Getting started
===============

Bitcoin-express payment library provides developer with the tools that let users from any website open a Bitcoin-express wallet.
The libray container will first ask the user to select their wallet and then launch it.

In addition, the library allows requests to a wallet to authorise payments. If the user confirms the payment, coins coming from the user payment will be sent for verification.

Wallets are instantly available directly from a Wallet supplier's site or more likely while visiting a merchant's site. Other than including this Javascript library on the page, merchants have no involvement in the establishment or operation of a Wallet.

There is no sign-up, download, installation or Browser configuration required for a user to obtain a Wallet. Wallets come preconfigured for use with a default Issuer (which they may change at any time), and will instantly be able to receive Bitcoin funds from any existing Bitcoin Wallet
(with the usual fees and confirmations).

Once funds have been confirmed, the user may immediately spend their coins as they wish.

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

From *gulpfile.js* modify the list of probes (list of wallets that will show initially) with the wallets you desire to use for your own built library.


How to use the library?
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
