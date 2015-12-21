'use strict';

/**
 * @ngdoc directive
 * @name webviewer.directive:wvToolbarButton
 * @description
 * # wvToolbarButton
 */
angular.module('webviewer')
  .directive('wvToolbarButton', function () {
    return {
      require: ['wvToolbarButton', '^wvToolbar'],
      scope: {
        wvName: '@',
        wvModel: '=',
        wvIcon: '@',
      },
      template: '<button type="button" ng-class="{btn: true, \'btn-sm\': true, \'btn-default\': true, active: wvModel}" ng-click="click()"><span ng-class="wvIcon"></span></button>',
      restrict: 'E',
      link: function postLink(scope, element, attrs, ctrls) {
        var buttonCtrl = ctrls[0];
        var toolbarCtrl = ctrls[1];

        if (typeof scope.wvModel === 'undefined') scope.wvModel = false;
        else if (scope.wvModel) toolbarCtrl.set(scope.wvName);

        // @todo send external changes to toolbar ctrl

        scope.$on('toolbar.deactivated', function(evt, buttonName) {
          if (buttonName == scope.wvName) scope.wvModel = false;
        });
        scope.$on('toolbar.activated', function(evt, buttonName) {
          if (buttonName == scope.wvName) scope.wvModel = true;
          // else scope.wvModel = false;
        });

        scope.click = function() {
          var previousValue = scope.wvModel;

          if (previousValue == false)
            toolbarCtrl.set(scope.wvName);
          else if (toolbarCtrl.get() == scope.wvName)
            toolbarCtrl.set(null);
        };
      },
      controller: function() {

      }
    };
  });
