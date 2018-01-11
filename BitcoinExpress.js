/**
 * Bitcoin-express payment library.
 *
 * Copyright (c) 2018-present, RMP Protection Ltd.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var frame_id = "walletxyz";

var BitcoinExpress = {
  BitcoinExpress: "v###VERSION###",
  wellKnownWallets: JSON.parse('###WELL_KNOWN_WALLETS###'),
  //Public functions to be called by site owner
  Initialise: function() {
    console.log("BitcoinExpress.Initialise");
    if(!("B_E" in window)) {
      window.B_E = window.BitcoinExpress;
      console.log("Setting B_E alias for window.BitcoinExpress host side");
    } else {
      // Remove any existing
      $("div#B_E_container").remove();      
      $("iframe.wallet").remove();      
    }
  },
  Wallet: {
    Dimentions: {
      WalletWindow : null,
      WalletWidth : null,
      WalletHeight : null,
      WalletArea : null,
      WalletLastPosition : {
        top: 0,
        left: 0,
      } // {top,left} of last dragged position
    },
    /**
     * Open a wallet for the user to view their balance etc. The BitcoinExpress container will first allow
     * the user to select their wallet and then launch it.
     * @return A Promise that normally resolves to a rejection with the message "Closed".
     */
    Open: function(params) {
      if (!params) {
        params = {};
      }
      BitcoinExpress.Initialise();
      return B_E._.getWalletDomain().then(function(domain) {
        return B_E._.startWallet(domain, params);
      });
    },
    /**
     * Request a wallet to authorise a payment. The BitcoinExpress container will first allow
     * the user to select their wallet and then launch it. If the user confirms the payment, coins
     * will be sent to the Merchant for verification and a PaymentAck will be returned to the caller. 
     * @param payment_details [object] (optional) A PaymentRequest object
     * @param payment_request_url [String] (optional) The 
     * @param version [Number] (optional) Defaults to 1
     * @return A Promise that resolves to a PaymentAck object or an Error
     */
    PaymentRequest: function(payment_details, payment_request_url, version) {
      BitcoinExpress.Initialise();      
      return B_E._.getPaymentRequest(payment_details, payment_request_url, version).then(function(paymentRequest) {
        return B_E._.getWalletDomain();
      }).then(function(domain) {
        return B_E._.startWallet(domain, paymentRequest);
      });
      //.catch(console.log.bind(console));
    }
  },
  // Internal functions
  _ : {
    startWallet: function (url, params) {
      console.log("starting wallet", url, params);
      // Add the wallet iframe
      $("body").append("<div id='B_E_container'/>");
      var walletUrl = url;

      this.isDraggable = false;
      this.activeDraggable = false;

      this.isModal = false;
      this.frame_id =  frame_id;
      var self = this;
      var fullScreen = ("fullScreen" in params && params["fullScreen"]);
      walletUrl += "?fullScreen=" + fullScreen;

      var PaymentUrl = null;
      if("PaymentRequest" in params) {
        var PaymentRequest = params.PaymentRequest
        walletUrl += "&paymentRequest="+encodeURI(JSON.stringify(params.PaymentRequest));
        if("PaymentDetails" in PaymentRequest && "payment_url" in PaymentRequest.PaymentDetails) {
          PaymentUrl = PaymentRequest.PaymentDetails.payment_url;
        }
        if(PaymentUrl === null) {
          return Promise.reject(new Error("PaymentRequest has no payment_url"));
        }
      }

      // Show wallet in the iframe
      $('<iframe>', {
        src: walletUrl,
        id: 'walletxyz',
        class: 'wallet',
        frameborder: 0,
        scrolling: 'no',
        style: "z-index: 10000000; display: hidden;"
      }).appendTo('body');

      return new Promise(function (resolve, reject) {
        //Listen for wallet messages
        var manageWalletEvents = function(event) {
          console.log("startWallet.manageWalletEvents",event);
          var message = event.data;
          console.log("CROSS DOMAIN::"+message.fn, message);

          /*
           * There are 2 classes of message that are expected.
           * A. Change the display and continue
           * B. Process and terminate
           */
          switch (message.fn) {
            //A. Alter the display and carry on
            case "show_iframe" :
              B_E._.show_iframe(frame_id, null, true, null);
              break;
                
            case "hide_iframe" :
              B_E._.show_iframe(frame_id, null, false, null);
              break;

            case "gomodal_iframe" :
              self.isModal = message.goModal;
              if (message.goModal) {
                var pos = B_E.Wallet.WalletLastPosition || { left: 0, top: 0 };

                var doc = document.documentElement;
                var left = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
                var top = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);

                B_E._.resize_iframe(frame_id, window.innerWidth, window.innerHeight);
                B_E._.move_iframe(frame_id, top, left);
                if (self.isDraggable) {
                  disableScroll(false);
                }
              } else {
                var pos = B_E.Wallet.WalletLastPosition || { left: 0, top: 0 };
                B_E._.resize_iframe(frame_id, message.width, message.height);
                B_E._.move_iframe(frame_id, pos.top, pos.left);
                if (self.isDraggable) {
                  enableScroll();
                }
              }
              break;

            case "resize_iframe" :
              if (message["fullScreen"]) {
                self.isDraggable = false;
                var size = self.get_window_size();
                B_E._.resize_iframe(frame_id, size.width, size.height);

                var doc = document.documentElement;
                var left = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
                var top = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);

                B_E._.move_iframe(frame_id, top, left);

              } else {
                self.isDraggable = true;
                B_E._.resize_iframe(frame_id, message.width, message.height);
                var pos = B_E.Wallet.WalletLastPosition;
                if (pos && "top" in pos && "left" in pos) {
                  B_E._.move_iframe(frame_id, pos.top, pos.left);
                }
              }
              break;
                
            case "start_drag_iframe":
              if (!self.isDraggable) {
                break;
              }
              B_E._.start_drag_iframe(message.clientX || message.pageX, message.clientY || message.pageY, frame_id);
              break;

            case "popup_message" :
              B_E._.popup_message(message.message, message.period);
              break;

            case "close_iframe" :
              window.removeEventListener("message", manageWalletEvents, false);
              enableScroll();
              reject(message.reason || "Closed");
              $("div.wallet").remove();
              break;

            case "remove_wallet":
              document.cookie = "BitcoinExpressWallet=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              enableScroll();
              window.removeEventListener("message", manageWalletEvents, false);
              //reject(message.reason || "Removed");
              $("iframe.wallet").remove();
              break;

            case "handle_failure" :
              window.removeEventListener("message", manageWalletEvents, false);
              enableScroll();
              //reject(message.reason);
              $("iframe.wallet").remove();
              break;

            case "payment" :
              if(!("payment" in message)) {
                reject(new Error("System error"));
              }
              var Payment = message.payment;
              console.log("Payment.id", Payment.id);
              //Send the payment to the merchant
              $.ajax({
                url: PaymentUrl,
                data: JSON.stringify(Payment),
                type: "POST",
                accepts: { json: "application/json" },
                contentType: "application/json",
                dataType: "json",
                timeout: (15 * 1000),
                async: true,
                success: function (paymentAck_container) {
                  console.log("paymentAck_container",paymentAck_container,Payment);
                  if (!("PaymentAck" in paymentAck_container)) {
                    event.source.postMessage({"err" : "PaymentAck undefined"}, "*");
                    window.removeEventListener("message", manageWalletEvents, false);
                  } else {
                    var PaymentAck = paymentAck_container.PaymentAck;
                    if(!("id" in PaymentAck && PaymentAck.id == Payment.Payment.id)) {
                      event.source.postMessage({"err" : "PaymentAck.id undefined or incorrect"}, "*");
                      window.removeEventListener("message", manageWalletEvents, false);
                    } else if(!("return_url" in PaymentAck)) {
                      event.source.postMessage({"err" : "PaymentAck.return_url undefined"}, "*");
                      window.removeEventListener("message", manageWalletEvents, false);
                    } else {
                      var paymentAckReceivedEvents = function (event) {
                        console.log("startWallet.paymentAckReceivedEvents",event);
                        var ackMessage = event.data;
                        if("fn" in ackMessage && ackMessage.fn == "paymentAckAck") {
                          //resolve(paymentAck_container);
                          //return the paymentAck to the caller
                          window.removeEventListener("message", paymentAckReceivedEvents, false);                    
                        }
                      };
                      //Send the Ack to the Wallet
                      event.source.postMessage({"fn" : "paymentAck", "ack" : paymentAck_container}, "*");
                      window.addEventListener("message", paymentAckReceivedEvents, false);
                    }
                  }
                },
                error: function(xhr, status, err) {
                  console.log(xhr, status, err);
                  event.source.postMessage({ err: err ? err.message || err : "Payment function failed" }, "*");
                  window.removeEventListener("message", manageWalletEvents, false);
                }
              });  
              break;
          }//end switch
        };
        window.addEventListener("message", manageWalletEvents, false);
        window.addEventListener("resize", function() {
          if (self.isDraggable && !self.isModal) {
            return;
          }
          B_E._.resize_iframe(frame_id, window.innerWidth, window.innerHeight);
        });
        console.log("Added event listener for manageWalletEvents and resize window");
      });
    },
    
    resize_iframe: function(iframe_id, width, height) {
      console.log("Resizing IFRAME "+iframe_id+" to "+width+"x"+height);

      var iframe = $('#'+iframe_id);
      if (iframe.length)
      {
        iframe.css({
          width: width,
          height: height
        });
        return true;
      }
      else
      {
        console.log("No such IFRAME "+iframe_id);
        return false;
      }
    },
    
    // ---------------------------------------------------------------
    // Start dragging
    start_drag_iframe: function (clientX, clientY, iframe_id) {
      console.log("Starting drag on "+iframe_id+" at "+clientX+","+clientY);

      // Scroll positions of the window
      var doc = document.documentElement;
      var x_elem = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
      var y_elem = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);

      var target = document.getElementById(iframe_id);
      var x_pos = 0, y_pos = 0; // Mouse position relative to iframe

      // Will be called when user dragging an element
      function _move_elem(e) {
        x_pos = document.all ? window.event.clientX : e.pageX;
        y_pos = document.all ? window.event.clientY : e.pageY;
        if (target !== null) {
          if (x_pos > $(window).width()) {
            target.style.left = (x_pos - clientX) + 'px';
          } else {
            target.style.left = (x_pos + x_elem - clientX) + 'px';
          }
          if (y_pos > $(window).height()) {
            target.style.top = (y_pos - clientY) + 'px';
          } else {
            target.style.top = (y_pos + y_elem - clientY) + 'px';
          }
        }
      }

      // Destroy the object when we are done
      function _destroy() {
        if (!target) {
          return;
        }
        B_E.Wallet.WalletLastPosition = {
          top: target.offsetTop,
          left: target.offsetLeft
        };
        document.onmousemove = null;
        document.onmouseup = null;
        target = null;
      }

      document.onmousemove = _move_elem;
      document.onmouseup = _destroy;

      return false;
    },
    
    // ---------------------------------------------------------------
    // Show/hide an IFRAME, with position used as follows:
    //   If not set, uses params.purse_position if set, otherwise last position,
    //      or centre of parent window the first time
    //   If a string, it is centred over the element with that id
    //   If an object with { left, top } it is positioned there directly
    show_iframe: function(iframe_id, params, show, position) {
      console.log((show?"Showing":"Hiding")+" IFRAME "+iframe_id);

      var iframe = $('#'+iframe_id);
      if (iframe.length)  {

        if (!show)  {
          iframe.css({
            left: -2000,
            display: "hidden"
          });
          return true;
        }

        var left, top;
        if (typeof position == "string") {
          console.log("Positioning over " + position);
          var positioner = $('#'+position);
          var offset = positioner.offset();
    
          // Centre over centre
          left = offset.left + (positioner.innerWidth()-iframe.outerWidth())/2;
          top  = offset.top + (positioner.innerHeight()-iframe.outerHeight())/2;
        } else if (position !== null && "left" in position && "top" in position) {
          console.log("Positioning at " + position.left + ", " + position.top);
          left = position.left;
          top  = position.top;
        } else {
          // Set left/top to centre of parent window
          var size = this.get_window_size();
          var w = $(window);
          left = (size.width-iframe.outerWidth())/2+w.scrollLeft();
          top = (size.height-iframe.outerHeight())/2+w.scrollTop();
          left = (left<5)?5:left;
          top = (top<5)?5:top;
        }

        console.log("Moving IFRAME to "+left+","+top);
        // Switch from being invisible to not being shown - we have to do this
        // Because unshown IFRAMEs aren't necessarily loaded
        iframe.css({
          left: left,
          top: top,
          position: "absolute"
        });
        iframe.css({
          display: "inherit"
        });
        B_E.Wallet.WalletLastPosition = {
          top: top,
          left: left
        };
        return true;
      } else {
        console.log("No such IFRAME "+iframe_id);
        return false;
      }
    },
    move_iframe: function (iframe_id, top, left) {
      var iframe = $('#'+iframe_id);
      iframe.css({
        left: left,
        top: top,
        position: "absolute"
      });
    },
    // ---------------------------------------------------------------
    // Get window dimensions - returns {width, height}
    get_window_size: function()  {
      return {
        width: window.innerWidth || document.body.clientWidth
          || document.documentElement && document.documentElement.clientWidth,
        height: window.innerHeight || document.body.clientHeight 
          || document.documentElement && document.documentElement.clientHeight 
      };
    }, 
  
    // ---------------------------------------------------------------
    // Show a popup message
    popup_message: function(text, delay) {
      delay = delay || 3000;
      console.log("Popup message: ["+text+"] for "+delay);

      var id = "message-popup";

      var div = $("<div/>", { 
        "id" : id, "class" : "wallet-message-popup",
        "style" : "position:fixed; top:32px; right:32px; width:200px; z-index:100; border:solid 1px black; padding:8px; " +
              "-moz-border-radius:5px; background-color:#ffffe0; display:none"
      });

      div.html(text);
      div.appendTo($("body"));
      div.fadeIn();

      // Fade out, then remove after delay
      setTimeout(function() { div.fadeOut(function() { div.remove(); })}, delay);
    },

    getPaymentRequest : function(payment_details, payment_request_url, version) {
      
      return new Promise(function(resolve,reject) {
      
      if(typeof payment_details === 'object') {
        resolve({
          "PaymentRequest" : {
            "payment_details_version" : (typeof version === 'undefined' ? "1" : version),
            "PaymentDetails" : payment_details
          }
        });
      } else {
        if(payment_request_url === null || typeof payment_request_url === 'undefined') {
          reject(new error("Either Payment details or Payment url must be defined"));
        } else {
          $.ajax({
            url: payment_request_url,
            type: "GET",
            accepts: { json: "application/json" },
            contentType: "application/json",
            dataType: "json",
            timeout: (30 * 1000),
            async: true,
            
            success: function(response) {
              if("PaymentRequest" in response) {
                resolve(response);
              } else {
                reject(new error("PaymentRequest not found"));
              }
            },
            
            error: function(xhr, status, err) {
              console.log(xhr, status, err);
              reject(new error("Payment function failed"));
            }
          });
        }
      }
     });
    },
    
    setWalletSelectorStyle: function (elementStr) {
      var container = $(elementStr);
      container[0].style.width = (300 - 48) + "px";
      container[0].style.height = (444 - 48) + "px";
      container[0].style.boxShadow = "0 0 10px 10px rgba(0, 0, 0, 0.1), 0 0 10px 10px rgba(0, 0, 0, 0.1)";
      container[0].style.textAlign = "center";
      container[0].style.margin = "20px";
      container[0].style.padding = "10px";
      container[0].style.color = "#fff";
      container[0].style["background-image"] = "url('https://bitcoin-e.org/static/images/Bitcoin-express-trans.png')";
      container[0].style["background-repeat"] = "no-repeat";
      container[0].style["background-position"] = "center 120px";
      container[0].style.backgroundColor = "#888";
      container[0].style.border =  "solid white 4px";
      container[0].style.borderRadius = "40px 12px 40px 12px";      
      container[0].style.position = "absolute";
      container[0].style["z-index"] = "20000";
      // Set left/top to centre of parent window
      var size = this.get_window_size();
      var w = $(window);
      var wleft = (size.width - container.outerWidth()) / 2 + w.scrollLeft();
      var wtop = (size.height - container.outerHeight()) / 2 + w.scrollTop();
      wleft = wleft < 5 ? 5 : wleft;
      wtop = wtop < 5 ? 5 : wtop;
      container[0].style.left = wleft + "px";      
      container[0].style.top = wtop + "px";      
    },
    
    buildWalletSelector: function (elementStr) {
      $("body").append("<div id='B_E_container' />");
      B_E._.setWalletSelectorStyle("div#B_E_container");

      var styleLine = 'width: 220px; margin: 5px auto; color: #efefef';

      $("div#B_E_container").append("<img id='logo_selector' src='https://bitcoin-e.org/wallet/css/img/BitcoinExpress.svg' style='margin: 10px; cursor: move;' />");
      $("div#B_E_container").append("<p style='" + styleLine + "'>Select your Wallet supplier:</p>");
      $("div#B_E_container").append("<ul style='padding: 0 0 0 0' type='text' id='wallet-list'></ul>");
      $("div#B_E_container").append("<p style='" + styleLine + "'>- OR -</p>");
      $("div#B_E_container").append("<p style='" + styleLine + "'>Enter your Wallet's domain</p>");
      $("div#B_E_container").append("<input id='user-domain' style='width: 168px; margin-top: 10px'/> <button name='ok'>OK</button>");
      $("div#B_E_container").append("<br/><br/>");
      $("div#B_E_container").append("<button name='cancel' style='margin-top: 20px; cursor: pointer;'>Cancel</button>");
    },

    getWalletDomain: function (paymentRequestContainer) {

      // First see if a Cookie for a wallet has already been instantiated in this browser on this site
      var previousDomain = B_E._.getCookie("BitcoinExpressWallet");
      if (previousDomain.length > 0) {
        return Promise.resolve(previousDomain);
      }

      return new Promise(function (resolve, reject) {
        B_E._.buildWalletSelector("div#B_E_container");
        // Must open the selector and allow the user to choose from a list of well known suppliers
        // Listen for the probes to respond and add them to the list for selection
        var registerProbe = function (event) {
          console.log("registerProbe",event);
          var message = event.data;
          if("fn" in message && message.fn === "probe") {
            console.log("Received from "+event.origin+": Name "+message.displayName+" - "+ (message.active?"active":"inactive"));
            // TO_DO
            var li = $("<li style='list-style:none;color: #00357d;font-size:110%;cursor:pointer;text-transform: uppercase' data-origin='"+event.origin+"'>"+message.displayName+"</li>");
            $("#wallet-list").append(li);
            li.click(function() {
              function setCookie(cname, cvalue, exdays) {
                var d = new Date();
                d.setTime(d.getTime() + (exdays*24*60*60*1000));
                var expires = "expires="+ d.toUTCString();
                document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
              }
              setCookie("BitcoinExpressWallet", event.origin+message.walletName, 30);
              window.removeEventListener("message", registerProbe, false);
              $("div#B_E_container").remove();
              resolve(event.origin+message.walletName);
            });
          } else {
            console.log("Received a message with no 'fn'");
          }
        };
        
        $("div#B_E_container button[name='cancel']").click(function(ev) {
          window.removeEventListener("message", registerProbe, false);
          $("div#B_E_container").remove();
          // reject(new Error("Cancelled"));
        });

        window.addEventListener("message", registerProbe, false);

        $("div#B_E_container button[name='ok']").click(function(){
          var userDomain = $("#user-domain").val();
          if(userDomain.length > 0) {
            $("div#B_E_container").remove();
            resolve("http://"+userDomain+":8080/Bitcoin-express/Tests/bitcoin-express-wallet-app-mock.html");        
          } else {
            console.log("user domain was empty");
          }
        });

        //start and iframe for each probe and wait for it to respond
        B_E.wellKnownWallets.forEach(function (supplier, i, array) {
          var probeName = supplier.protocol + supplier.domain + supplier.port + supplier.path + supplier.probe;
          console.log(probeName);
          $("div#B_E_container").append("<iframe src='"+probeName+"' style='display : none'></iframe>");
        });

        var handles = $("img#logo_selector");
        handles.mousedown(function (event) {
          // Check event target, otherwise in IE we trigger a false drag even
          // if an area element is clicked
          if (handles.index(event.target) >= 0) {
            var position = $("div#B_E_container").position();
            B_E._.start_drag_iframe(event.clientX - position.left, event.clientY - position.top, "B_E_container");
            return false;
          } else {
            console.log("Mousedown not on handle ignored");
          }
        });
      });
    },
    
    getCookie : function (cname) {
      var name = cname + "=";
      var ca = document.cookie.split(';');
      for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
          c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
          return c.substring(name.length, c.length);
        }
      }
      return "";
    },
    
    setCookie: function(cname, cvalue, exdays) {
      var d = new Date();
      d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
      var expires = "expires="+d.toUTCString();
      document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    }
  }, // end internal functions

  // Host functions are called by a wallet and communicate with the Host page
  Host: {

    /**
     * Initialise the Host by setting the library namespace to "B_E" 
     */  
    Initialise: function () {
      if(!("B_E" in window)) {
        window.B_E = window.BitcoinExpress;
        console.log("Setting B_E alias for window.BitcoinExpress wallet side");
      }    
    },

    /**
     * Ask the Host to display the Wallet
     * @param area [string]
     * @param width [number]
     * @param height [number]
     * @param idDrag [string]
     * @return A Promise that resolves to "OK" or an error
     */
    WalletReveal: function (area, width, height, idDrag) {
      console.log("Host.WalletReveal", area, width, height, idDrag);
      var self = this;
      return new Promise(function(resolve,reject) {
        if (typeof BitcoinExpress.Host != 'undefined') {
          self.sendMessage({
            fn: "resize_iframe",
            width: width,
            height: height
          });

          self.sendMessage({
            fn: "show_iframe"
          });

          if (idDrag) {
            self.WalletMakeDraggable(idDrag);
          }

          B_E.Wallet.Dimentions.WalletWidth = width;
          B_E.Wallet.Dimentions.WalletHeight = height;
          B_E.Wallet.Dimentions.WalletArea = $("#" + area);
          resolve("OK");
        } else {
          reject(new Error("Host not found"));
        }
      });
    },

    /**
     * @param goModal [bool]
     * @param width [number]
     * @param height [number]
     */
    WalletGoModal: function (goModal, width, height) {
      console.log("Host.WalletGoModal", goModal, width, height);
      this.sendMessage({
        fn: "gomodal_iframe",
        width: width,
        height: height,
        goModal: goModal
      });
    },
    
    /**
     * Ask the Host to dismiss the wallet display
     * @param message [String]
     * @param reason [String]
     * @return A Promise that resolves to "OK" or an error
     */
    WalletClose: function (message, reason) {
      console.log("WalletClose ", message, reason);
      if (typeof BitcoinExpress.Host != 'undefined') {
        this.sendMessage({
          fn: "popup_message",
          message: message,
          period: 4000
        });
        this.sendMessage({
          fn: "handle_failure",
          reason: reason
        });
        return Promise.resolve("OK");
      } else {
        return Promise.reject(new Error("Host not found"));
      }
    },

    /**
    * Ask the Host to dismiss the wallet display
    * @param message [String]
    * @param reason [String
    * @return A Promise that resolves to "OK" or an error
    */
    WalletRemove: function (message, reason) {
      console.log("WalletRemove ", message, reason);
      if (typeof BitcoinExpress.Host != 'undefined') {
        this.sendMessage({
          fn: "popup_message",
          message: message,
          period: 4000
        });
        this.sendMessage({
          fn: "remove_wallet",
          reason: reason
        });
        return Promise.resolve("OK");
      } else {
        return Promise.reject(new Error("Host not found"));
      }
    },

    /**
     * Ask the Host to display the wallet full screen or widget mode
     * @param goFullScreen [boolean]
     * @return A Promise that resolves to "OK" or an error
     */
    WalletFullScreen: function (goFullScreen) {
      console.log("WalletFullScreen", goFullScreen);
      if (typeof BitcoinExpress.Host != 'undefined') {
        if (goFullScreen) {
          disableScroll();
          setTimeout(function () {
            this.sendMessage({
              fn: "resize_iframe",
              fullScreen: true,
            });
            document.getElementsByTagName("body")[0].style.visibility = "inherit";
          }, 500);
        } else {
          enableScroll();
          this.sendMessage({
            fn: "resize_iframe",
            width: B_E.Wallet.Dimentions.WalletWidth,
            height: BitcoinExpress.Wallet.Dimentions.WalletHeight,
            fullScreen: false
          });
        }
        return Promise.resolve("OK");
      } else {
        return Promise.reject(new Error("Host not found"));
      }
    },

    /**
     * Ask the Host to permit the user to drag the wallet widget around the screen
     * @param handles [object] (jQuery context) or body background by default
     * @return A Promise that resolves to "OK" or an error
     */
    WalletMakeDraggable: function (handles) {
      console.log("WalletMakeDraggable ", handles);

      if (handles) {
        handles = $("#" + handles);
      } else {
        handles = handles || $('body');
      }

      if (typeof BitcoinExpress.Host != 'undefined') {
        var self = this;

        // Register mouse down event
        handles.mousedown(function (event) {
          // Check event target, otherwise in IE we trigger a false drag
          // even if an area element is clicked
          if (handles.index(event.target) >= 0) {
            // Run it through the function to setup bubbling
            if (!self.activeDraggable) {
              bubbleIframeMouseMove(window.parent.document.getElementById(frame_id));
              self.activeDraggable = true;
            }

            // Mouse up/move execution from the parent of the the iframe
            function bubbleIframeMouseMove(iframe) {
              // Save any previous onmousemove handler
              var existingOnMouseMove = window.document.onmousemove;
              var existingOnMouseUp = window.document.onmouseup;

              // Attach a new onmousemove listener
              window.document.onmousemove = function(e) {
                // Fire any existing onmousemove listener 
                if(existingOnMouseMove) existingOnMouseMove(e);

                // Create a new event for the this window
                var evt = document.createEvent("MouseEvents");

                // We'll need this to offset the mouse move appropriately
                var boundingClientRect = iframe.getBoundingClientRect();

                // Initialize the event, copying exiting event values
                // for the most part
                evt.initMouseEvent( 
                  "mousemove", 
                  true, // bubbles
                  false, // not cancelable 
                  window,
                  e.detail,
                  e.screenX,
                  e.screenY, 
                  e.clientX + boundingClientRect.left, 
                  e.clientY + boundingClientRect.top, 
                  e.ctrlKey, 
                  e.altKey,
                  e.shiftKey, 
                  e.metaKey,
                  e.button, 
                  null // no related element
                );

                // Dispatch the mousemove event on the iframe element
                iframe.dispatchEvent(evt);
              };

              // Attach a new onmousemove listener
              window.document.onmouseup = function(e) {
                // Fire any existing onmousemove listener 
                if(existingOnMouseUp) existingOnMouseUp(e);

                // Create a new event for the this window
                var evt = document.createEvent("MouseEvents");

                // We'll need this to offset the mouse move appropriately
                var boundingClientRect = iframe.getBoundingClientRect();

                // Initialize the event, copying exiting event values
                // for the most part
                evt.initMouseEvent( 
                  "mouseup", 
                  true, // bubbles
                  false, // not cancelable 
                  window,
                  e.detail,
                  e.screenX,
                  e.screenY, 
                  e.clientX + boundingClientRect.left, 
                  e.clientY + boundingClientRect.top, 
                  e.ctrlKey, 
                  e.altKey,
                  e.shiftKey, 
                  e.metaKey,
                  e.button, 
                  null // no related element
                );

                // Dispatch the mouseup event on the iframe element
                iframe.dispatchEvent(evt);
              };
            }

            self.sendMessage({
              fn: "start_drag_iframe",
              clientX: event.clientX,
              clientY: event.clientY
            });
            return false;
          } else {
            console.log("Mousedown not on handle ignored");
          }
        });
        return Promise.resolve("OK");
      } else {
        return Promise.reject(new Error("Host not found"));
      }
    },

    /**
     * Send payment to the site owner
     * @param payment [object] A Bitcoin-express Payment object
     * @param amount [Number] The value of the payment
     * @return A Promise that resolves to a Bitcoin-express PaymentAck object or an Error
     */
    Payment : function(payment, amount) {
      console.log("Payment",payment,amount);
      var self = this;
      return new Promise(function(resolve,reject) {
        if (typeof BitcoinExpress.Host != 'undefined') {
          //prepare for the paymentAck to come back
          var paymentAckReceivedEvents = function (event) {
            console.log("Host.Payment.paymentAckReceivedEvents", event);
            var data = event.data;
            if (typeof event.data == "string") {
              data = JSON.parse(event.data);
            }
            var ackMessage = data;
            window.removeEventListener("message", paymentAckReceivedEvents, false);
            if ("fn" in ackMessage && ackMessage.fn == "paymentAck") {
              resolve(ackMessage.ack);
            } else if ("err" in ackMessage) {
              reject(ackMessage.err);
            } else {
              reject(Error("Problem on processing payment"));
            }
          };
          window.addEventListener("message", paymentAckReceivedEvents, false);
          self.sendMessage({
            fn: "payment",
            payment: payment
          });
        } else {
          reject(Error("Bitcoin-express not initialised"));
        }
      });
    },
    
    /**
     * Acknowledge that PaymentAck data has been persisted and the wallet is ready to be closed.
     * If the wallet wishes to send a final popup message it should do so before calling this function.
     * @return A Promise that resolves to "OK" or an Error
     */
    PaymentAckAck : function() {
      console.log("Host.PaymentAckAck");
      var self = this;
      return new Promise(function(resolve,reject) {
          if(typeof BitcoinExpress.Host != 'undefined') {
            B_E.Host.sendMessage({"fn" : "paymentAckAck"});
            resolve("OK");
          } else {
            reject(new Error("Bitcoin-express not initialised"));
          }
      });
    },
    
    /**
     * Send a pop up message to the Host for the specifed duration
     * @param text [String] The message that will be displayed
     * @param duration [Number] The duration of the display in milli-seconds
     * @return A Promise that resolves to "OK" of an Error
     */
    PopupMessage: function (text, duration_ms) {
      console.log("Host.PopupMessage",text,duration_ms);
      var self = this;
      return new Promise(function(resolve,reject) {
        if(typeof BitcoinExpress.Host != 'undefined') {
          self.sendMessage({"fn" : "popup_message", "message" : text, "period" : duration_ms});
          resolve("OK");
        } else {
          reject(new Error("Bitcoin-express not initialised"));
        }
      });
    },
    
    sendMessage: function (message) {
      console.log("Host.sendMessage",message);
      parent.postMessage(message, "*");
    }
  } //end host
};

function preventDefault(e) {
  e = e || window.parent.event;
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.returnValue = false;  
}

function preventDefaultForScrollKeys(e) {
  // left: 37, up: 38, right: 39, down: 40,
  // spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
  var keys = {37: 1, 38: 1, 39: 1, 40: 1};

  if (keys[e.keyCode]) {
    preventDefault(e);
    return false;
  }
}

function disableScroll(hide) {
  if (hide == undefined) {
    hide = true;
  }
  if (window.parent.addEventListener) {
    // older FF
    window.parent.addEventListener('DOMMouseScroll', preventDefault, false);
  }
  // modern standard
  window.parent.onwheel = preventDefault;
  // older browsers, IE
  window.parent.onmousewheel = window.parent.document.onmousewheel = preventDefault;
  // mobile
  window.parent.ontouchmove  = preventDefault;
  window.parent.document.onkeydown  = preventDefaultForScrollKeys;
  window.parent.document.getElementsByTagName("body")[0].style.overflow = "hidden";

  if (hide) {
    document.getElementsByTagName("body")[0].style.visibility = "hidden";
  }
}

function enableScroll() {
  if (window.removeEventListener) {
    window.parent.removeEventListener('DOMMouseScroll', preventDefault, false);
  }
  window.parent.onmousewheel = window.parent.document.onmousewheel = null; 
  window.parent.onwheel = null; 
  window.parent.ontouchmove = null;  
  window.parent.document.onkeydown = null;  
  window.parent.document.getElementsByTagName("body")[0].style.overflow = "scroll";
}
