(function () {
  'use strict';

  /*SLIDER WITH TWO LABELS*/

  angular
    .module('webApp')
    .directive('cSlider', cSlider);

  cSlider.$inject = [];


  function cSlider() {
    return {
      restrict: 'E',
      scope: {
        minText: "=minText",
        maxText: "=maxText",
        minValue: "=minValue",
        maxValue: "=maxValue",
        steps: "=steps",
        value: "=value"
      },
      replace: "true",
      templateUrl: 'templates/components/c-slider.tpl.html',
    }
  };
})();
