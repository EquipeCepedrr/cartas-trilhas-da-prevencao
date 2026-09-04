(function () {
  'use strict';
  if (typeof Object.assign !== 'function') {
    Object.assign = function (target) {
      if (target === null || typeof target === 'undefined') throw new TypeError('Cannot convert undefined or null to object');
      var output = Object(target);
      var i;
      for (i = 1; i < arguments.length; i += 1) {
        var source = arguments[i];
        if (source !== null && typeof source !== 'undefined') {
          Object.keys(Object(source)).forEach(function (key) { output[key] = source[key]; });
        }
      }
      return output;
    };
  }
  if (window.Element && !Element.prototype.closest) {
    Element.prototype.closest = function (selector) {
      var element = this;
      while (element && element.nodeType === 1) {
        if (element.matches(selector)) return element;
        element = element.parentElement || element.parentNode;
      }
      return null;
    };
  }
  if (window.Element && !Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
  }
}());
