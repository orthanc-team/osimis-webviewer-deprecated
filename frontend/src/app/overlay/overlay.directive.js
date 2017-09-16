/**
 * @ngdoc directive
 * @name webviewer.directive:wvOverlay
 * 
 * @restrict Element
 * @requires webviewer.directive:wvViewport
 *
 * @param {boolean} [wvKeyImageCaptureEnabled=false]
 * When activated, this option displays a button on each viewport. When the button is
 * clicked, a new DICOM series is created with the image of the viewport, including the
 * annotations. This image is considered as a DICOM Key Image Note (see 
 * `http://wiki.ihe.net/index.php/Key_Image_Note`).
 *
 */
var ArrayHelpers = {
   pushIfDefined: function(array, value) {
        if (value) {
            array.push(value);
        }
   },
   pushIfDefinedWithPrefix: function(array, prefix, value) {
        if (value) {
            array.push(prefix + value);
        }
    }
 };

(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvOverlay', wvOverlay);

    /* @ngInject */
    function wvOverlay(wvStudyManager) {
        var directive = {
            bindToController: true,
            controller: Controller,
            controllerAs: 'vm',
            replace: true, // avoid overlay capturing viewport events
            link: link,
            restrict: 'E',
            transclude: true,
            require: {
                series: '?^^vpSeriesId'
            },
            templateUrl: 'app/overlay/overlay.directive.html',
            scope: {
                wvTags: '=?',
                wvSeries: '=?',
                studyId: '=?wvStudyId',
                wvViewport: '=?',
                image: '=wvImage',
                keyImageCaptureEnabled: '=?wvKeyImageCaptureEnabled',
            }
        };
        return directive;

        function link(scope, element, attrs, ctrls) {
            var _this = this;
            var vm = scope.vm;

            // Set default value.
            vm.keyImageCaptureEnabled = typeof vm.keyImageCaptureEnabled !== 'undefined' ? vm.keyImageCaptureEnabled : false;

            vm.showTopLeftArea = function() {
                return !!vm.topLeftLines && vm.topLeftLines.length > 0;
            };
            vm.showTopRightArea = function() {
                return !!vm.bottomRightLines && vm.bottomRightLines.length > 0;
            };
            vm.showBottomRightArea = function() { // this is a mix of viewport information (check in the html code + custom layout defined in this code)
                return !!vm.wvViewport && !!vm.bottomRightLines && vm.bottomRightLines.length > 0;
            };
            vm.showBottomLeftArea = function() {
                return !!vm.bottomLeftLines && vm.bottomLeftLines.length > 0;
            };

            vm.getTopLeftArea = function(seriesTags) {
                var lines = [];

                ArrayHelpers.pushIfDefined(lines, seriesTags.PatientName);
                ArrayHelpers.pushIfDefined(lines, seriesTags.PatientID);
                ArrayHelpers.pushIfDefined(lines, seriesTags.OsimisNote);

                return lines;
            };
            vm.getTopRightArea = function(seriesTags) {
                var lines = [];

                ArrayHelpers.pushIfDefined(lines, seriesTags.StudyDescription);
                ArrayHelpers.pushIfDefined(lines, seriesTags.StudyDate);

                var lineElements = [];
                ArrayHelpers.pushIfDefinedWithPrefix(lineElements, "#", seriesTags.SeriesNumber);
                ArrayHelpers.pushIfDefined(lineElements, seriesTags.SeriesDescription);
                if (lineElements.length > 0) {
                    lines.push(lineElements.join(" - "));
                }

                return lines;
            };
            vm.getBottomLeftArea = function(seriesTags) { // this has been added for Avignon, it still needs to be checked with nico how it should be done for good
                var lines = [];

                ArrayHelpers.pushIfDefined(lines, seriesTags.PatientOrientation);
                ArrayHelpers.pushIfDefined(lines, seriesTags.ImageLaterality);
                ArrayHelpers.pushIfDefined(lines, seriesTags.ViewPosition);

                return lines;
            };
            vm.getBottomRightArea = function(seriesTags) {
                return [];
            };


            // auto grab series model
            if (ctrls.series) {
                var series = ctrls.series.getSeries();
                vm.wvSeries = series;
                vm.topLeftLines = vm.getTopLeftArea(vm.wvSeries.tags);
                vm.topRightLines = vm.getTopRightArea(vm.wvSeries.tags);
                vm.bottomLeftLines = vm.getBottomLeftArea(vm.wvSeries.tags);
                vm.bottomRightLines = vm.getBottomRightArea(vm.wvSeries.tags);

                ctrls.series.onSeriesChanged(_this, function(series) {
                    vm.wvSeries = series;
                    vm.topLeftLines = vm.getTopLeftArea(vm.wvSeries.tags);
                    vm.topRightLines = vm.getTopRightArea(vm.wvSeries.tags);
                    vm.bottomLeftLines = vm.getBottomLeftArea(vm.wvSeries.tags);
                    vm.bottomRightLines = vm.getBottomRightArea(vm.wvSeries.tags);
                });
                scope.$on('$destroy', function() {
                    ctrls.series.onSeriesChanged.close(_this);
                });
            }

            // Update study model.
            vm.study = undefined;
            scope.$watch('vm.studyId', function(studyId) {
                // Clear study if studyId is removed.
                if (!studyId) {
                    vm.study = undefined;
                    return;
                }

                // Load new study.
                wvStudyManager
                    .get(studyId)
                    .then(function(study) {
                        vm.study = study;
                    });
            });

        }
    }

    /* @ngInject */
    function Controller() {

    }
})();