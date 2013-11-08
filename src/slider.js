/*
 jQuery UI Slider plugin wrapper
*/
angular.module('ui.slider', []).value('uiSliderConfig',{}).directive('uiSlider', ['uiSliderConfig', '$timeout', function(uiSliderConfig, $timeout) {
    uiSliderConfig = uiSliderConfig || {};
    return {
        require: 'ngModel',
        compile: function () {
            return function (scope, elm, attrs, ngModel) {

                function parseNumber(n, decimals) {
                    return (decimals) ? parseFloat(n) : parseInt(n);
                };

                var options = angular.extend(scope.$eval(attrs.uiSlider) || {}, uiSliderConfig);
                // Object holding range values
                var prevRangeValues = {
                    min: null,
                    max: null
                };

                // convenience properties
                var properties = ['min', 'max', 'step'];
                var useDecimals = (!angular.isUndefined(attrs.useDecimals)) ? true : false;

                var init = function() {
                    // When ngModel is assigned an array of values then range is expected to be true.
                    // Warn user and change range to true else an error occurs when trying to drag handle
                    if (angular.isArray(ngModel.$viewValue) && options.range !== true) {
                        console.warn('Change your range option of ui-slider. When assigning ngModel an array of values then the range option should be set to true.');
                        options.range = true;
                    }

                    // Ensure the convenience properties are passed as options if they're defined
                    // This avoids init ordering issues where the slider's initial state (eg handle
                    // position) is calculated using widget defaults
                    // Note the properties take precedence over any duplicates in options
                    angular.forEach(properties, function(property) {
                        if (angular.isDefined(attrs[property])) {
                            options[property] = parseNumber(attrs[property], useDecimals);
                        }
                    });

                    elm.slider(options);
                    init = angular.noop;
                };

                // Find out if decimals are to be used for slider
                angular.forEach(properties, function(property) {
                    // support {{}} and watch for updates
                    attrs.$observe(property, function(newVal) {
                        if (!!newVal) { //danger! edge case !!0 won't behave as intended
                            init();
                            elm.slider('option', property, parseNumber(newVal, useDecimals));
                        }
                    });
                });
                attrs.$observe('disabled', function(newVal) {
                    init();
                    elm.slider('option', 'disabled', !!newVal);
                });

                // Watch ui-slider (byVal) for changes and update
                scope.$watch(attrs.uiSlider, function(newVal) {
                    init();
                    elm.slider('option', newVal);
                }, true);

                // Late-bind to prevent compiler clobbering
                $timeout(init, 0, true);

                // Update model value from slider
                elm.bind('slide', function(event, ui) {
                    ngModel.$setViewValue(ui.values || ui.value);
                    scope.$apply();
                });

                // Update slider from model value
                ngModel.$render = function() {
                    init();
                    var method = options.range === true ? 'values' : 'value';

                    if (!ngModel.$viewValue)
                        ngModel.$viewValue = 0;

                    // Do some sanity check of range values
                    if (options.range === true) {

                        // Check outer bounds for min and max values
                        if (angular.isDefined(options.min) && options.min > ngModel.$viewValue[0]) {
                            ngModel.$viewValue[0] = options.min;
                        }
                        if (angular.isDefined(options.max) && options.max < ngModel.$viewValue[1]) {
                            ngModel.$viewValue[1] = options.max;
                        }

                        // Check min and max range values
                        if (ngModel.$viewValue[0] >= ngModel.$viewValue[1]) {
                            // Min value should be less to equal to max value
                            if (prevRangeValues.min >= ngModel.$viewValue[1])
                                ngModel.$viewValue[0] = prevRangeValues.min;
                            // Max value should be less to equal to min value
                            if (prevRangeValues.max <= ngModel.$viewValue[0])
                                ngModel.$viewValue[1] = prevRangeValues.max;
                        }

                        // Store values for later user
                        prevRangeValues.min = ngModel.$viewValue[0];
                        prevRangeValues.max = ngModel.$viewValue[1];

                    }
                    elm.slider(method, ngModel.$viewValue);
                };

                scope.$watch(attrs.ngModel, function() {
                    if (options.range === true) {
                        ngModel.$render();
                    }
                }, true);

                function destroy() {
                    elm.slider('destroy');
                }
                elm.bind('$destroy', destroy);
            };
        }
    };
}]).directive('uiLogSlider', ['uiSliderConfig', '$timeout', function(uiSliderConfig, $timeout) {
    //uiLogSlider doesn't presently support range
    //rather than pass the jQuery UI our actual min and max we make the underlying
    //jquery ui slider manage 0-1, split in to 1000 steps
    //we then translate from our ngModel values using a power function across the slider's
    uiSliderConfig = uiSliderConfig || {};
    return {
        require: 'ngModel',
        compile: function () {
            return function (scope, elm, attrs, ngModel) {

                function parseNumber(n, decimals) {
                    return (decimals) ? parseFloat(n) : parseInt(n);
                };

                function bound(min, val, max) {
                    return Math.max(min, Math.min(val, max));
                };

                // translate from 0-1 range to external range
                function externalValueFromInternal(val) {
                    var exMin = options['external-min'],
                        exMax = options['external-max'],
                        exStep = options['external-step'];
                    //linear translation
                    var unroundedExVal = exMin + (exMax-exMin) * val;
                    //TODO: log/power translation
                    //round the value
                    var roundedExVal = Math.round(unroundedExVal/exStep)*exStep;
                    //then bound it
                    return bound(exMin, roundedExVal, exMax);
                };

                function internalValueFromExternal(val) {
                    // note: we (currently) don't enforce our step on the incoming value
                    // note: we also don't enforce bounds checking here
                    var exMin = options['external-min'],
                        exMax = options['external-max'],
                        exStep = options['external-step'];

                    //TOOD: log/power translation

                    return (val - exMin) / (exMax - exMin);
                };

                var options = angular.extend(scope.$eval(attrs.uiLogSlider) || {}, uiSliderConfig);
                options = angular.extend(options, {min:0, max:1, step:0.001});
                // // Object holding range values
                // var prevRangeValues = {
                //     min: null,
                //     max: null
                // };

                // convenience properties, for the log slider these are not passed directly to
                // the underlying widget
                var properties = ['min', 'max', 'step'];
                //var useDecimals = (!angular.isUndefined(attrs.useDecimals)) ? true : false;
                var useDecimals = true; // in fact parseNumbers could be refactored away in this case

                var init = function() {
                    // // When ngModel is assigned an array of values then range is expected to be true.
                    // // Warn user and change range to true else an error occurs when trying to drag handle
                    // if (angular.isArray(ngModel.$viewValue) && options.range !== true) {
                    //     console.warn('Change your range option of ui-slider. When assigning ngModel an array of values then the range option should be set to true.');
                    //     options.range = true;
                    // }

                    // Don't pass our convenience properties on to the slider as is, instead store
                    // them prefixed for our translation
                    angular.forEach(properties, function(property) {
                        if (angular.isDefined(attrs[property])) {
                            options['external-' + property] = parseNumber(attrs[property], useDecimals);
                        }
                    });

                    elm.slider(options);
                    init = angular.noop; //protect against undesired repeated init
                };

                angular.forEach(properties, function(property) {
                    // support {{}} and watch for updates
                    attrs.$observe(property, function(newVal) {
                        if (!!newVal) { //danger! edge case !!0 won't behave as intended
                            options['external-' + property] = parseNumber(newVal, useDecimals);
                            //TODO: refresh (as translation needs update)
                        }

                        // if (!!newVal) {
                        //     init();
                        //     elm.slider('option', property, parseNumber(newVal, useDecimals));
                        // }
                    });
                });
                attrs.$observe('disabled', function(newVal) {
                    init();
                    elm.slider('option', 'disabled', !!newVal);
                });

                // Watch ui-slider (byVal) for changes and update
                scope.$watch(attrs.uiLogSlider, function(newVal) {
                    init();
                    elm.slider('option', newVal);
                }, true);

                // Late-bind to prevent compiler clobbering
                $timeout(init, 0, true);

                // Update model value from slider
                elm.bind('slide', function(event, ui) {
                    //ngModel.$setViewValue(ui.values || ui.value);
                    ngModel.$setViewValue(externalValueFromInternal(ui.value));
                    scope.$apply();
                });

                // Update slider from model value
                ngModel.$render = function() {
                    init();
                    var method = options.range === true ? 'values' : 'value';

                    if (!ngModel.$viewValue)
                        ngModel.$viewValue = 0;

                    // Do some sanity check of range values
                    // if (options.range === true) {

                    //     // Check outer bounds for min and max values
                    //     if (angular.isDefined(options.min) && options.min > ngModel.$viewValue[0]) {
                    //         ngModel.$viewValue[0] = options.min;
                    //     }
                    //     if (angular.isDefined(options.max) && options.max < ngModel.$viewValue[1]) {
                    //         ngModel.$viewValue[1] = options.max;
                    //     }

                    //     // Check min and max range values
                    //     if (ngModel.$viewValue[0] >= ngModel.$viewValue[1]) {
                    //         // Min value should be less to equal to max value
                    //         if (prevRangeValues.min >= ngModel.$viewValue[1])
                    //             ngModel.$viewValue[0] = prevRangeValues.min;
                    //         // Max value should be less to equal to min value
                    //         if (prevRangeValues.max <= ngModel.$viewValue[0])
                    //             ngModel.$viewValue[1] = prevRangeValues.max;
                    //     }

                    //     // Store values for later user
                    //     prevRangeValues.min = ngModel.$viewValue[0];
                    //     prevRangeValues.max = ngModel.$viewValue[1];

                    // }
                    elm.slider(method, internalValueFromExternal(ngModel.$viewValue));
                };

                scope.$watch(attrs.ngModel, function() {
                    // if (options.range === true) {
                    //     ngModel.$render();
                    // }
                }, true);

                function destroy() {
                    elm.slider('destroy');
                }
                elm.bind('$destroy', destroy);
            };
        }
    };
}])
