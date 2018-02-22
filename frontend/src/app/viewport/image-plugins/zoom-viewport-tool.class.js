/**
 * @ngdoc object
 * @memberOf osimis
 * 
 * @name osimis.ZoomViewportTool
 *
 * @description
 * The `ZoomViewportTool` class applies zoom to a viewport.
 */
(function(osimis) {
    'use strict';

    function ZoomViewportTool() {
    };

    ZoomViewportTool.prototype.apply = function(viewport, delta) {
        var viewportData = viewport.getViewport();
        var scale = +viewportData.scale;

        viewportData.scale = scale + (delta / 100);

        viewport.setViewport(viewportData);
        viewport.draw(false);
    };


    osimis.ZoomViewportTool = ZoomViewportTool;

    angular
        .module('webviewer')
        .factory('wvZoomViewportTool', wvZoomViewportTool);

    /* @ngInject */
    function wvZoomViewportTool() {
        return new osimis.ZoomViewportTool();
    }
})(this.osimis || (this.osimis = {}));