'use strict';

/**
 * @ngdoc directive
 * @name osimiswebviewerApp.directive:wvViewport
 * @description
 * # wvViewport
 */
angular.module('osimiswebviewerApp')
.directive('wvViewport', ['orthanc', function(orthanc) {
return {
  scope: {
    wvInstanceId: '=',
    wvWidth: '=?', // default: auto ( fit to max(parent.width,image.width) )
    wvHeight: '=?', // default: auto ( fit to width*(1/ratio) )
    wvAutoResize: '=?', // resize on each image change - default: true
  },
  transclude: true,
  template: '<div style="position: relative">\
                <div class="cornerstone-enabled-image"\
                oncontextmenu="return false"\
                unselectable="on"\
                onselectstart="return false;"\
                onmousedown="return false;"\
              >\
                  <div oncontextmenu="return false" />\
                  <ng-transclude/>\
              </div>\
            </div>',
  restrict: 'E',
  replace: false,
  link: function postLink(scope, parentElement, attrs) {
      var _isLoaded = false;
      
      var jqElement = parentElement.children().children();
      var domElement = jqElement[0];
      var _image = null;
      var _onWindowResize = null;

      cornerstone.enable(domElement);
      
      if (scope.wvInstanceId !== null && scope.wvInstanceId != undefined) {
        _displayImage(scope.wvInstanceId)
      }
      scope.$watch('wvInstanceId', _displayImage);

      scope.$watchGroup(['wvWidth', 'wvHeight'], _processResizeArgs);

      if (scope.wvAutoResize === null || scope.wvAutoResize == undefined) { // @todo document that wvAutoResize concern recizing image **on scroll**
        scope.wvAutoResize = true;
      }

      scope.$on('viewport-command', function(evt, strategy) {
        var csViewport = cornerstone.getViewport(domElement);
      	csViewport = strategy.execute(csViewport);
        cornerstone.setViewport(domElement, csViewport);
        scope.$broadcast('viewport-data', csViewport); // @todo is this necessary ?
      });

      function _displayImage(wvInstanceId, old) {
        if (wvInstanceId == old) return;

        if (wvInstanceId === null || wvInstanceId == undefined) {
          return;
        }

        var imagePromise = cornerstone
        .loadAndCacheImage(wvInstanceId)
        .then(function(image) {
          _image = image;

          var csViewport = cornerstone.getViewport(domElement);
          cornerstone.displayImage(domElement, _image, csViewport);
          if (scope.wvAutoResize == true) {
            _processResizeArgs([scope.wvWidth, scope.wvHeight]);
          }
  
          // load instance data
          orthanc
          .instance.getTags({id: _image.imageId})
          .$promise
          .then(function(tags) {
            // @todo just once on first load ?
            var csViewport = cornerstone.getViewport(domElement);
            csViewport.voi.windowCenter = tags.WindowCenter; // @todo once on first load
            csViewport.voi.windowWidth = tags.WindowWidth;
            cornerstone.setViewport(domElement, csViewport);

            scope.$broadcast('instance-data', tags);
            scope.$broadcast('viewport-data', csViewport); // @todo is this necessary ?
          });

          if (!_isLoaded) {
            _isLoaded = true;
          }

        });
        
        return imagePromise;
      }

      function _processResizeArgs(newValues, old) {
        if (newValues == old) return;
        
        if (!_image) {
          return;
        }

        // reset window resizing event when resizing mode change
        if (_onWindowResize) {
          $(window).off('resize', _onWindowResize);
          _onWindowResize = null;
        }

        var wvWidth = newValues[0];
        var wvHeight = newValues[1];
        var width, height;

        // @todo prevent recursive call (http://jsfiddle.net/ubdr3ou5/)
        // @todo check scope is the last argument
        
        if (wvWidth === null || wvWidth == undefined) {
          wvWidth = 'auto';
        }
        if (wvHeight === null || wvHeight == undefined) {
          wvHeight = 'auto';
        }

        var ratio = _image.width/_image.height;
        if (wvWidth === 'auto' && wvHeight === 'auto') {
          // auto size width & height based on image width & height
          width = _image.width;
          height = _image.height;
        }
        else if (wvWidth !== 'auto' && wvHeight === 'auto') {
          // resize width & fit height based on wvWidth param
          var maxWidth = wvWidth;
          width = _image.width < maxWidth ? _image.width : maxWidth;
          height = Math.round(width * (1/ratio));
        }
        else if (wvWidth === 'auto' && wvHeight !== 'auto') {
          // resize height && fit width based on wvHeightParam
          var maxHeight = wvHeight;
          height = _image.height < maxHeight ? _image.height : maxHeight;
          width = Math.round(height * ratio);
        }
        else if (wvWidth === 'parent' && wvHeight === 'parent') { // @todo allow to use only one parent and not both
          var parentContainer = parentElement.closest('[wv-viewport-size]');

          if (!parentContainer.length) {
            return;
          }

          width = parentContainer.width();
          height = parentContainer.height();

          // adapt size when window resizes
          _onWindowResize = _.debounce(function() {
            // @note may induce bug if DOM structure changes before resizing (cf. parentContainer is cached)
            width = parentContainer.width();
            height = parentContainer.height();
            _resize(width, height);
          }, 10);
          $(window).on('resize', _onWindowResize);
          scope.$on('$destroy', function() {
            if (_onWindowResize) {
              $(window).off('resize', _onWindowResize);
              _onWindowResize = null;
            }
          });
        }
        else {
          // @todo: document "you need to omit 'px'"
          width = wvWidth;
          height = wvHeight;
        }

        _resize(width, height);
      }
      
      function _resize(width, height) {
        var csViewport;

        jqElement.width(width);
        jqElement.height(height);

        var fitToWindow = _image.width > width || _image.height > height;
        if (fitToWindow) {
          cornerstone.resize(domElement, true);
          csViewport = cornerstone.getViewport(domElement);
        }
        else {
          cornerstone.resize(domElement, false);
          csViewport = cornerstone.getViewport(domElement);
          csViewport.scale = 1.0;
          cornerstone.setViewport(domElement, csViewport);
        }
        
        scope.$broadcast('viewport-data', csViewport);
      }
  }
};
}]);