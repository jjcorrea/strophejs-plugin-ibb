/*global Strophe $iq $ */
/*

  (c) 2013 - Arlo Breault <arlolra@gmail.com>
  Freely distributed under the MPL v2.0 license.

  File: strophe.ibb.js
  XEP-0047: In-Band Bytestreams
  http://xmpp.org/extensions/xep-0047.html

*/

;(function () {
  "use strict";

  function noop() {}

  Strophe.addConnectionPlugin('ibb', {

    _c: null,
    _cb: null,

    init: function (c) {  
      this._c = c;
      Strophe.addNamespace('IBB', 'http://jabber.org/protocol/ibb');
      c.addHandler(this._receive.bind(this), Strophe.NS.IBB, 'iq', 'set');
    },

    _createErr: function (to, id, type, name) {
      var iq = $iq({
        type: 'error',
        to: to,
        id: id
      }).c('error', {
        type: type
      }).c(name, {
        xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'
      })
      return iq;
    },

    _receive: function (m) {
      var $m = m;
      var from = $m.getAttribute('from');
      var id = $m.getAttribute('id');

      // support ibb?
      // proceed?
      // prefer smaller chunks?

      var iq = $iq({
        type: 'result',
        to: from,
        id: id
      });
      this._send(iq, noop, noop);

      var child = $m.childNodes[0];
      var type = child.tagName.toLowerCase();
      var sid = child.getAttribute('sid');

      var data, seq;
      if (type === 'data') {
        data = child.textContent;
        seq = child.getAttribute('seq');
      }

      // callback message
      if (typeof this._cb === 'function') {
        this._cb(type, from, sid, data, seq);
      }

      return true;  // keep handler active

    },

    _success: function (cb) {
      cb(null);
    },

    _fail: function (cb, stanza) {
      var err = 'timed out';
      if (stanza) {
        err = stanza.querySelector('error')
                .childNodes[0]
                .tagName
                .toLowerCase();
      }
      cb(new Error(err));
    },

    _send: function (iq, success, fail) {
      this._c.sendIQ(iq, success, fail, 60 * 1000);
    },

    open: function (to, sid, bs, cb) {

      if (parseInt(bs ? bs : 0, 10) > 65535)
        return cb(new Error('Block-size too large.'))

      // construct iq
      var iq = $iq({
        type: 'set',
        to: to,
        id: this._c.getUniqueId('ibb')
      }).c('open', {
        xmlns: Strophe.NS.IBB,
        stanza: 'iq',
        sid: sid,
        'block-size': bs || '4096'
      });

      this._send(iq,
        this._success.bind(this, cb),
        this._fail.bind(this, cb)
      );

    },

    data: function (to, sid, seq, data, cb) {

      var iq = $iq({
        type: 'set',
        to: to,
        id: this._c.getUniqueId('ibb')
      }).c('data', {
        xmlns: Strophe.NS.IBB,
        seq: seq.toString(),
        sid: sid
      }).t(data);

      this._send(iq,
        this._success.bind(this, cb),
        this._fail.bind(this, cb)
      );

    },

    close: function (to, sid, cb) {

      // construct iq
      var iq = $iq({
        type: 'set',
        to: to,
        id: this._c.getUniqueId('ibb')
      }).c('close', {
        xmlns: Strophe.NS.IBB,
        sid: sid
      });

      this._send(iq,
        this._success.bind(this, cb),
        this._fail.bind(this, cb)
      );

    },

    addIBBHandler: function (fn) {
      this._cb = fn;
    }

  });

}());
