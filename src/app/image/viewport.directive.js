(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvViewport', wvViewport)
        .run(function(cornerstoneTools) {
            var toolStateManager = cornerstoneTools.newImageIdSpecificToolStateManager();
            toolStateManager.getStateByToolAndImageId = function(toolName, imageId) {
                return this.toolState[imageId] && this.toolState[imageId][toolName];
            };
            toolStateManager.restoreStateByToolAndImageId = function(toolName, imageId, state) {
                this.toolState[imageId] = this.toolState[imageId] || {};
                this.toolState[imageId][toolName] = state;
            };
            cornerstoneTools.globalImageIdSpecificToolStateManager = toolStateManager;
        });

    /* @ngInject */
    function wvViewport($, _, cornerstone, cornerstoneTools, $rootScope, $q, $parse, wvImage) {
        // Usage:
        //
        // Creates:
        //
        var directive = {
            transclude: true,
            bindToController: true,
            controller: Controller,
            controllerAs: 'vm',
            templateUrl: 'app/image/viewport.directive.tpl.html',
            link: link,
            restrict: 'E',
            require: {
                'wvViewport': 'wvViewport',
                'wvSize': '?wvSize'
            },
            scope: {
                wvImageId: '=?',
                // wvImage: '=?',
                wvTags: '=?',
                wvViewport: '=?',
                wvEnableOverlay: '=?'
            }
        };

        /**
         * responsibility: manage directive's information flow
         * 
         * dataflows: 
         *   directive's controller
         *     [command] -> controller -> attributes/$scope -> viewmodel -> cornerstone API -> [dom]
         *     [request] <- controller <- attributes/$scope <- viewmodel <- [out]
         *   directive's attributes
         *     [command] -> attributes/$scope -> viewmodel -> cornerstone API -> [dom]
         *     [request] <- attributes/$scope <- viewmodel <- [out]
         *   wv-size dependency
         *     [update] -> viewmodel -> cornerstone API -> [dom]
         */
        function link(scope, element, attrs, ctrls) {
            var enabledElement = element.children('.wv-cornerstone-enabled-image')[0];
            var model = new ViewportViewModel(wvImage, enabledElement);

            scope.vm.wvEnableOverlay = !!scope.vm.wvEnableOverlay;
            var wvImageIdParser = $parse(attrs.wvImageId);

            // bind directive's sizing (via wv-size controller) to cornerstone
            {
                var wvSizeCtrl = ctrls.wvSize;
                var unbindWvSize = _bindWvSizeController(wvSizeCtrl, model);
            }

            // bind directive's controller to cornerstone (via directive's attributes)
            {
                var ctrl = ctrls.wvViewport;
                ctrl.getImage = function() {
                    return model.getImageId();
                };
                ctrl.setImage = function(id, resetConfig) {
                    var resetConfig = resetConfig || false;

                    scope.vm.wvImageId = id;

                    return model.setImage(id, resetConfig);
                };
                ctrl.clearImage = function() {
                    scope.vm.wvImageId = null;
                };
            }

            // bind directive's attributes to cornerstone
            {
                scope.$watch('vm.wvImageId', function (wvImageId, old) {
                    if (!wvImageId) {
                        model.clearImage();
                    }
                    else {
                        model.setImage(wvImageId);
                    }
                });
            }

            // bind model to directive's attributes
            // bind tags
            model.onImageChanged(function(image) {
                scope.vm.wvTags = image.tags;
            });
            element.on('CornerstoneImageRendered', function(evt, args) { // element.off not needed
                scope.$evalAsync(function() { // trigger a new digest if needed
                    scope.vm.wvViewport = args.viewport;
                });
            });
            // cornerstone.
                // bind cornerstone viewport
                // scope.vm.wvViewport

            // unlisten binds
            scope.$on('$destroy', function() {
                if (unbindWvSize) {
                    unbindWvSize();
                    unbindWvSize = null;
                }
                model.destroy();
            });

            function _bindWvSizeController(wvSizeController, model) {
                if (!wvSizeController) {
                    model.resizeViewport(element.width(), element.height());
                    return null;
                }

                //model.resizeViewport(wvSizeController.getWidthInPixel(), wvSizeController.getHeightInPixel());
                var unlistenWvSizeFn = wvSizeController && wvSizeController.onUpdate(function() {
                    var width = wvSizeController.getWidthInPixel();
                    var height = wvSizeController.getHeightInPixel();

                    model.resizeViewport(width, height);
                    
                    if (model.hasImage()) {
                        model.autoScaleImage();
                    }
                });

                return function unbind() {
                    unlistenWvSizeFn();
                }
            }
            
            /** register tools
             *
             * Tool directiev spec:
             * - name ends with ViewportTool
             * 
             * Tool controller interface:
             * - void register(ctrl)
             * - void unregister(ctrl)
             */
            model.onImageChanged.once(function(currentImage) {
                _forEachViewportTool(function(toolCtrl) {
                    toolCtrl.register(model);
                    scope.$on('$destroy', function() {
                        toolCtrl.unregister(model);
                    });
                });
            });
            function _forEachViewportTool(callback) {
                _.forEach(ctrls, function(ctrl, ctrlName) {
                    var ctrlIsTool = _.endsWith(ctrlName, 'ViewportTool');
                    if (!ctrl) {
                        return;
                    }
                    else if (ctrlIsTool) {
                        callback(ctrl, ctrlName);
                    }
                });
            }
        }

        /**
         * responsibility: manage cornerstone viewport
         */
        function ViewportViewModel(wvImageRepository, enabledElement) {
            var _this = this;

            this._imageRepository = wvImageRepository;
            this._enabledElement = enabledElement;

            this._imageId = null;
            this._image = null;
            this._viewportWidth = null;
            this._viewportHeight = null;
            this._imageShownPromise = null;

            this.onImageChanged = new osimis.Listener();

            cornerstone.enable(enabledElement);
        }

        ViewportViewModel.prototype.onImageChanged = angular.noop;
        
        ViewportViewModel.prototype.destroy = function() {
            cornerstone.disable(this._enabledElement);
        };

        ViewportViewModel.prototype.getEnabledElement = function() {
            return this._enabledElement;
        };
        ViewportViewModel.prototype.getViewport = function() {
            return cornerstone.getViewport(this._enabledElement);
        };
        ViewportViewModel.prototype.setViewport = function(viewport) {
            return cornerstone.setViewport(this._enabledElement, viewport);
        };

        ViewportViewModel.prototype.getImageId = function() {
            return this._imageId;
        };
        ViewportViewModel.prototype.getImage = function() {
            return this._image;
        };
        ViewportViewModel.prototype.setImage = function(id, resetConfig) {
            if (id == this._imageId && !resetConfig) {
                return $q.reject('This image is already shown');
            }

            var _this = this;
            var doAutoScaleImage = this._imageId === null ? true : false; // don't override actual viewport configuration
            resetConfig = resetConfig || false;

            this._imageId = id;
            
            this._imageShownPromise = $q
                // make sure multiple setImage calls are always sequencials
                // @todo make the last setImage be taken into account
                // @note serie model should have the responsibililty to handle which one is displayed
                .when(this._imageShownPromise)
                .then(function() {
                    return $q.all({
                        processedImage: cornerstone.loadImage('orthanc://' + id),
                        imageModel: _this._imageRepository.get(id)
                    });
                })
                .then(function(args) {
                    var processedImage = args.processedImage;
                    var imageModel = args.imageModel;

                    return $q(function(resolve, reject) {
                        /*
                        if (_this._imageId != imageModel.id) {
                            reject('This image no longer need to be shown');
                            return;
                        }
                        */

                        requestAnimationFrame(function() {
                            $rootScope.$apply(function() {
                                if (!resetConfig) {
                                    cornerstone.displayImage(_this._enabledElement, processedImage);
                                }
                                else {
                                    var viewport = cornerstone.getDefaultViewportForImage(_this._enabledElement, processedImage);
                                    cornerstone.displayImage(_this._enabledElement, processedImage, viewport);
                                }

                                if (doAutoScaleImage || resetConfig) {
                                    _this.autoScaleImage();
                                }

                                $(_this._enabledElement).css('visibility', 'visible');

                                resolve(args);
                            });
                        });
                    });
                })
                .then(function(args) {
                    var newImageModel = args.imageModel;
                    var oldImageModel = _this._image;
                    _this._image = newImageModel;
                    _this.onImageChanged.trigger(newImageModel, oldImageModel);
                });

            return this._imageShownPromise;
        };
        ViewportViewModel.prototype.clearImage = function() {
            this._imageId = null;

            //cornerstone.displayImage(this._enabledElement, null);
            $(this._enabledElement).css('visibility', 'hidden');
        };
        ViewportViewModel.prototype.hasImage = function() {
            return this._imageId !== null;
        }

        ViewportViewModel.prototype.resizeViewport = function(width, height) {
            var jqEnabledElement = $(this._enabledElement);

            this._viewportWidth = width;
            this._viewportHeight = height;

            jqEnabledElement.width(width);
            jqEnabledElement.height(height);
            cornerstone.resize(this._enabledElement, false);
        };

        ViewportViewModel.prototype.autoScaleImage = function() {
            var csImage = cornerstone.getImage(this._enabledElement);

            var isImageSmallerThanViewport = csImage.width <= this._viewportWidth && csImage.height <= this._viewportHeight;
            if (isImageSmallerThanViewport) {
                cornerstone.resize(this._enabledElement, false);
                var viewport = cornerstone.getViewport(this._enabledElement);
                viewport.scale = 1.0;
                cornerstone.setViewport(this._enabledElement, viewport);
            }
            else {
                cornerstone.fitToWindow(this._enabledElement);
            }
        };

        return directive;
    }

    /**
     * responsibility: manage inter-directive communications
     *
     * @ngInject
     */
    function Controller($scope, $element, cornerstone, wvImage) {
        this.getImage = angular.noop;
        this.setImage = angular.noop;
        this.clearImage = angular.noop;
    }

})();
