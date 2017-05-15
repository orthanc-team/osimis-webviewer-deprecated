/**
 * @ngdoc directive
 * @name webviewer.directive:wvSerieslist
 * 
 * @restrict Element
 *
 * @scope
 *
 * @param {string} wvStudyId
 * The id of the study.
 * 
 * @param {callback} [wvOnStudyLoaded=undefined]
 * Callback mainly used for unit test.
 *
 * @param {string} [wvDisplayMode='grid']
 * Display mode of the list.
 *
 * The value can either be:
 *
 * * `grid` The items are shown in a grid format.
 * * `list` The items are shown in a list format.
 *
 * @param {boolean} [wvVideoDisplayEnabled=true]
 * Display videos in the serieslist.
 * 
 * @param {boolean} [wvSelectionEnabled=false]
 * Let the end-user select series in the serieslist using a single click. This
 * selection has no impact on the standalone viewer. However, host applications
 * can retrieve the selection to do customized actions using the
 * `wvSelected[Series|Video|Report]Ids` parameter.
 *
 * @param {Array<string>} [wvSelectedSeriesIds=EmptyArray]
 * When `wvSelectionEnabled` is set to true, this parameter provide the list of
 * selected series as orthanc ids. This list can be retrieved to customize the
 * viewer by host applications.
 * 
 * @param {Array<string>} [wvSelectedReportIds=EmptyArray]
 * When `wvSelectionEnabled` is set to true, this parameter provide the list of
 * selected series as orthanc ids. This list can be retrieved to customize the
 * viewer by host applications.
 * 
 * @param {Array<string>} [wvSelectedVideoIds=EmptyArray]
 * When `wvSelectionEnabled` is set to true, this parameter provide the list of
 * selected series as orthanc ids. This list can be retrieved to customize the
 * viewer by host applications.
 */
(function() {
    'use strict';

    angular
        .module('webviewer')
        .directive('wvSerieslist', wvSerieslist);

    /* @ngInject */
    function wvSerieslist($q, wvStudyManager, wvSeriesManager, wvVideoManager, wvPdfInstanceManager, wvPaneManager) {
        var directive = {
            bindToController: true,
            controller: SerieslistVM,
            controllerAs: 'vm',
            link: link,
            restrict: 'E',
            scope: {
                studyId: '=wvStudyId',
                onStudyLoaded: '&?wvOnStudyLoaded', // For testing convenience
                displayMode: '=?wvDisplayMode',
                videoDisplayEnabled: '=?wvVideoDisplayEnabled',

                // Selection-related
                selectionEnabled: '=?wvSelectionEnabled',
                selectedSeriesIds: '=?wvSelectedSeriesIds',
                selectedReportIds: '=?wvSelectedReportIds',
                selectedVideoIds: '=?wvSelectedVideoIds'
            },
            templateUrl: 'app/serieslist/serieslist.directive.html'
        };
        return directive;

        function link(scope, element, attrs) {
            var vm = scope.vm;

            // Adapt serieslist on input change.
            scope.$watch('vm.studyId', _setStudy);

            function _setStudy(id, old) {
                if (!id) return; 
                // @todo handle IsStable === false

                vm.videoDisplayEnabled = typeof vm.videoDisplayEnabled !== 'undefined' ? vm.videoDisplayEnabled : true;
                
                // Clean selection
                // @todo Only cleanup when selection has not been reset at the
                // same time as the study id.
                vm.selectedSeriesIds = [];
                vm.selectedReportIds = [];
                vm.selectedVideoIds = [];
                vm.loaded = false;

                // Databind viewed items.
                vm.paneManager = wvPaneManager;

                wvStudyManager
                    .get(id)
                    .then(function(study) {
                        vm.study = study;
                    });

                wvSeriesManager
                    .listFromOrthancStudyId(id)
                    .then(function(seriesList) {
                        // Set image series ids.
                        vm.seriesIds = seriesList.map(function(series) {
                            return series.id;
                        });

                        // Update video & pdf instance ids (once the series 
                        // have been loaded since the series manager request 
                        // will load the pdf instances too in one single HTTP
                        // request).
                        return $q.all({
                            videos: vm.videoDisplayEnabled && $q.all(wvVideoManager.listInstanceIdsFromOrthancStudyId(id)),
                            pdfInstances: $q.all(wvPdfInstanceManager.listFromOrthancStudyId(id))
                        });
                    })
                    .then(function(data) {
                        var videos = data.videos;
                        var pdfInstances = data.pdfInstances;
                        
                        // Set video models.
                        vm.videos = videos;

                        // Set pdf instances.
                        vm.pdfInstanceIds = _.keys(pdfInstances).length && pdfInstances.map(function(pdfInstance) {
                            return pdfInstance.id;
                        });

                        // Display the content.
                        vm.loaded = true;

                        // Trigger on-study-loaded (mainly for testing
                        // convenience).
                        if (vm.onStudyLoaded) {
                            vm.onStudyLoaded();
                        }
                    }, function(err) {
                        // Trigger on-study-loaded with the error.
                        if (vm.onStudyLoaded) {
                            vm.onStudyLoaded({$error: err})
                        }
                    });
            }
        }
    }

    /* @ngInject */
    function SerieslistVM() {
        // Set initial values.
        this.seriesIds = [];
        this.pdfInstanceIds = [];
        this.videos = [];
        this.displayMode = typeof this.displayMode !== 'undefined' ? this.displayMode : 'grid';
        this.selectionEnabled = typeof this.selectionEnabled !== 'undefined' ? this.selectionEnabled : false;
        this.selectedSeriesIds = this.selectedSeriesIds || [];
        this.selectedVideoIds = this.selectedVideoIds || [];
        this.selectedReportIds = this.selectedReportIds || [];

        this.toggleSeriesSelection = function(seriesId) {
            // Do nothing if selection is disabled
            if (!this.selectionEnabled) {
                return;
            }

            // Activate selection for seriesId
            if (this.selectedSeriesIds.indexOf(seriesId) === -1) {
                this.selectedSeriesIds.push(seriesId);
            }
            // Deactivate selection for seriesId
            else {
                var index = this.selectedSeriesIds.indexOf(seriesId);
                this.selectedSeriesIds.splice(index, 1);
            }
        };

        this.toggleReportSelection = function(id) {
            // Do nothing if selection is disabled
            if (!this.selectionEnabled) {
                return;
            }

            // Activate selection for id
            if (this.selectedReportIds.indexOf(id) === -1) {
                this.selectedReportIds.push(id);
            }
            // Deactivate selection for id
            else {
                var index = this.selectedReportIds.indexOf(id);
                this.selectedReportIds.splice(index, 1);
            }
        };

        this.toggleVideoSelection = function(videoId) {
            // Do nothing if selection is disabled
            if (!this.selectionEnabled) {
                return;
            }

            // Activate selection for videoId
            if (this.selectedVideoIds.indexOf(videoId) === -1) {
                this.selectedVideoIds.push(videoId);
            }
            // Deactivate selection for videoId
            else {
                var index = this.selectedVideoIds.indexOf(videoId);
                this.selectedVideoIds.splice(index, 1);
            }
        };
    }
  
})();