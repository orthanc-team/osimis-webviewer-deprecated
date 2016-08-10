(function() {
    'use strict';

    angular
        .module('webviewer')
        .run(function($rootScope, wvSeriesManager, wvImageManager, wvImageBinaryManager, WvImageQualities) {

            // Preload thumbnail when user has selected a study (on left menu)
            $rootScope.$on('UserSelectedStudyId', function(evt, studyId) {
                wvSeriesManager
                    .listFromOrthancStudyId(studyId)
                    .then(function(seriesList) {
                        // Preload every series' thumbnails
                        seriesList.forEach(function(series) {
                            // Preload every series' tags (for thumbnails' scroll-on-over / required for RecommendedFrameRate tag)
                            for (var i=0; i<series.imageIds.length; ++i) {
                                var imageId = series.imageIds[i];

                                wvImageManager.get(imageId);
                            }

                            // Select the lowest quality available
                            var quality = Math.min.apply(Math, _.toArray(series.availableQualities));
                            _preload(series, quality, 2);
                        });
                    });
            });

            // Stop preloading when user has changed selected study (on left menu)
            $rootScope.$on('UserUnSelectedStudyId', function(evt, studyId) {
                wvSeriesManager
                    .listFromOrthancStudyId(studyId)
                    .then(function(seriesList) {
                        // Abort preloading
                        seriesList.forEach(function(series) {
                            // Select the lowest quality available
                            var quality = Math.min.apply(Math, _.toArray(series.availableQualities));
                            _preload(series, quality, 2);
                        });
                    });
            });

            // Preload series' when user has selected a series (dropped in a viewport)
            $rootScope.$on('UserSelectedSeriesId', function(evt, seriesId) {
                wvSeriesManager
                    .get(seriesId)
                    .then(function(series) {
                        // Preload every series' tags
                        for (var i=0; i<series.imageIds.length; ++i) {
                            var imageId = series.imageIds[i];

                            wvImageManager.get(imageId);
                        }

                        // Select the lowest quality available
                        var quality = Math.min.apply(Math, _.toArray(series.availableQualities));
                        // Preload every series' thumbnails
                        _preload(series, quality, 1);

                        // Preload whole 1000x1000 studies images
                        quality = WvImageQualities.MEDIUM;
                        if (series.hasQuality(quality)) {
                            _preload(series, quality, 1);
                        }

                        // Preload lossless studies images
                        quality = Math.max.apply(Math, _.toArray(series.availableQualities));
                        _preload(series, quality, 1);
                    });
            });

            // Stop preloading when user has changed selected series (dropped in a viewport)
            $rootScope.$on('UserUnSelectedSeriesId', function(evt, seriesId) {
                wvSeriesManager
                    .get(seriesId)
                    .then(function(series) {
                        // Abort every series' thumbnails preloading
                        var quality = Math.min.apply(Math, _.toArray(series.availableQualities));
                        _preload(series, quality, 1);

                        // Abort 1000x1000 studies images preloading
                        quality = WvImageQualities.MEDIUM;
                        if (series.hasQuality(quality)) {
                            _preload(series, quality, 1);
                        }

                        // Abort lossless studies images preloading
                        quality = Math.max.apply(Math, _.toArray(series.availableQualities));
                        _preload(series, quality, 1);
                    });
            });

            function _preload(series, quality, priority) {
                for (var i=0; i<series.imageIds.length; ++i) {
                    var imageId = series.imageIds[i];
                    wvImageBinaryManager.requestLoading(imageId, quality, priority);
                }
            }

            // $rootScope.$on('UserSelectedImageFromSeries', function(evt, image, series) {
                // Augment priority from image around

                // var index = series.indexOf(image.id) - series.imageCount
                // -5 + 5 ?
            // });

            // $rootScope.$on('UserUnSelectedImageFromSeries', function(image, series) {
                // var index = series.indexOf(image.id) - series.imageCount
                // -5 + 5 ?
            // });
        });
})();