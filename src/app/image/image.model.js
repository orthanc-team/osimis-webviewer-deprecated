(function() {
    'use strict';

    angular
        .module('webviewer')
        .factory('WvImage', factory);

    /* @ngInject */
    function factory(wvAnnotationManager, WvAnnotationValueObject) {
        /*
         * @RootAggregate
         * @note wvImageManager is injected for lazy loading purpose
         */
        function WvImage(wvImageManager, id, tags, postProcesses) {
            var _this = this;

            this.id = id;
            this.tags = tags;

            // collection of postprocesses
            this.postProcesses = postProcesses || [];

            this.onAnnotationChanged = new osimis.Listener();
            
            wvAnnotationManager.onAnnotationChanged(function(annotation) {
                // @todo need to be destroyed on no listener anymore

                if (annotation.imageId !== _this.id) return;

                _this.onAnnotationChanged.trigger(annotation);
            });

            // lazy load the pixel object
            this.getPixelObject = function() {
                // result is not a 2d array of pixels but an object containing an attribute with the array
                var resultPromise = wvImageManager.getPixelObject(this.id); // mainImagePixelObject
                var getPixelsObjectFromImageIdFn = wvImageManager.getPixelObject.bind(wvImageManager);

                this.postProcesses.forEach(function(postProcess) {
                    resultPromise = resultPromise
                        .then(function(actualPixelObject) {
                            return postProcess.execute(actualPixelObject, getPixelsObjectFromImageIdFn);
                        });
                });
                
                return resultPromise;
            }

        }

        WvImage.prototype.getAnnotations = function(type) {
            return wvAnnotationManager.getByImageId(this.id, type);
        };

        WvImage.prototype.setAnnotations = function(type, data) {
            var annotation = new WvAnnotationValueObject(type, this.id, data);
            wvAnnotationManager.set(annotation);
        };

        ////////////////

        return WvImage;
    }
})();