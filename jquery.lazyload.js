// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// @output_file_name default.js
// @externs_url http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.js
// ==/ClosureCompiler==

/**
 * jQuery lazyLoad Plugin 1.0a1
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
 * Totally rebuilded lazyload plugin based on https://github.com/tuupola/jquery_lazyload
 *
 * @author Eugene Poltorakov <jslayer@gmail.com>
 *
 * TODO:
 *  - implement effects support
 *  - full code refactoring
 *  - error handling
 *  - threshold support
 *  - testing & posible ML fixes
 *  - provide better examples
 */

(function($, window) {
  var Viewport, Settings, QueueItem;
  /** @typedef {{x1:number,x2:number,y1:number,y2:number}} */
  Viewport;
  /** @typedef {{on:string, threshold:number, effect: string, selector: string, attribute: string, concurrent:number}} */
  Settings;
  /** @typedef {{element: HTMLImageElement, src: string}} */
  QueueItem;

  /**
   * @type {Array.<QueueItem>}
   * @private
   */
  var queue = [ ];
  /**
   * @type {boolean}
   * @private
   */
  var locked = false;

  var waiting = 0;

  /**
   * @type {Settings}
   * @private
   */
  var defaults = {
    on        : 'scroll',
    threshold : 1000,
    effect    : 'show',//not used
    selector  : '[data-original]',
    attribute : 'data-original',
    concurrent: 5,
    speed     : 50//this property will be removed in the future
  };

  /**
   * @param {HTMLElement} e
   * @return {Viewport}
   */
  function getViewport(e) {
    var rect = e.getBoundingClientRect();

    return {
      x1: rect.left,
      x2: rect.left + e.clientWidth,
      y1: rect.top,
      y2: rect.top + e.clientHeight
    };
  }

  function diff(a1, a2) {
    return a1.filter(function(i) {return !((a2.indexOf ? a2.indexOf(i) : $.inArray(i, a2)) > -1)});
  }

  /**
   * @param {Settings} settings
   */
  function startLoading(settings) {
    if (waiting >= settings.concurrent) {
      return;
    }
    /** @type QueueItem */
    var item;

    for(var i = 0; i < settings.concurrent; i++) {
      item = queue.shift();
      if (!item) {
        continue;
      }
      waiting++;
      (function(item) {
        $('<img />').on('load', function() {
          waiting--;
          $(item.element).hide().attr('src', this.src).fadeIn(settings.speed);
          setTimeout(function() {
            startLoading(settings);
          }, 50);
        }).on('error', function() {//todo - better error handling
            waiting--;
            startLoading(settings);
          }).attr('src', item.src);
      })(item);
    }
  }

  /**
   * @param {Viewport} p
   * @param {Viewport} c
   * @return {boolean}
   */
  function isViewPortIncludes(p, c) {
    return (p.x1 <= c.x1 && p.y1 <= c.y1 && p.x2 >= c.x1 && p.y2 >= c.y1) || (p.x1 <= c.x2 && p.y1 <= c.y2 && p.x2 >= c.x2 && p.y2 >= c.y2);
  }

  /**
   * @param {?Settings} options
   * @this {jQuery}
   */
  $.fn['lazyLoad'] = function(options) {
    /** @type {Settings} */
    var settings = $.extend({}, defaults, options);

    //prepare ns events
    var on = $.map(settings.on.split(' '), function(name) {return name + '.lazy'}).join(' ');

    this.each(function() {
      var container = this, timer,
        $container = $(this),
        /** @type {Array.<HTMLImageElement>} */
          list  = $container.find(settings.selector).map(function() {return this});

      function calculate() {
        var i, image, imageVP,
          remove = [ ],
          newItems = [ ],
          containerVP = getViewport(container);//todo - apply threshold

        for(i = 0; i < list.length; i++) {
          image = list[i];
          imageVP = getViewport(image);

          if (isViewPortIncludes(containerVP, imageVP)) {
            newItems.push({
              element: image,
              src: image.dataset ? image.dataset['original'] : $(image).attr('data-original')
            });
            remove.unshift(i);
          }
        }

        for(i = newItems.length - 1; i >= 0; i--) {
          queue.unshift(newItems[i]);
        }

        list = diff(list, remove);

        if (list.length == 0) {
          $container.off(on);
        }

        startLoading(settings);
      }

      $container.on(on, function() {
        clearTimeout(timer);
        timer = setTimeout(calculate, 200);
      });

      //trigger first ns event
      $container.trigger(on.split(' ')[0]);
    });
    return this;
  };
})(jQuery, window);
