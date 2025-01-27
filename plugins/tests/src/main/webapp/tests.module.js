/*
 *
 * Headwind MDM: Open Source Android MDM Software
 * https://h-mdm.com
 *
 * Copyright (C) 2019 Headwind Solutions LLC (http://h-sms.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

// Localization completed
angular.module('plugin-tests', ['ngResource', 'ui.bootstrap', 'ui.router', 'ngTagsInput', 'ncy-angular-breadcrumb'])
    .config(function ($stateProvider) {
        try {
            $stateProvider.state('plugin-tests', {
                url: "/" + 'plugin-tests',
                templateUrl: 'app/components/main/view/content.html',
                controller: 'TabController',
                ncyBreadcrumb: {
                    label: '{{"breadcrumb.plugin.tests.main" | localize}}', //label to show in breadcrumbs
                },
                resolve: {
                    openTab: function () {
                        return 'plugin-tests';
                    }
                },
            });
        } catch (e) {
            console.log('An error when adding state ' + 'plugin-tests', e);
        }

        try {
            $stateProvider.state('plugin-settings-tests', {
                url: "/" + 'plugin-settings-tests',
                templateUrl: 'app/components/main/view/content.html',
                controller: 'TabController',
                ncyBreadcrumb: {
                    label: '{{"breadcrumb.plugin.tests.main" | localize}}', //label to show in breadcrumbs
                },
                resolve: {
                    openTab: function () {
                        return 'plugin-settings-tests'
                    }
                },
            });
        } catch (e) {
            console.log('An error when adding state ' + 'plugin-settings-messaging', e);
        }
    })
    .factory('pluginTestsService', function ($resource) {
        return $resource('', {}, {
            purgeOldMessages: {url: 'rest/plugins/tests/private/purge/:days', method: 'GET'},
            getMessages: {url: 'rest/plugins/tests/private/search', method: 'POST'},
            sendMessage: {url: 'rest/plugins/tests/private/send', method: 'POST'},
            deleteMessage: {url: 'rest/plugins/tests/:id', method: 'DELETE'},
            lookupDevices: {url: 'rest/private/devices/autocomplete', method: 'POST'},
        });
    })
    .factory('getDevicesService', ['pluginTestsService', function(pluginTestsService) {
        var getDeviceInfo = function( device ) {
            if ( device.info ) {
                try {
                    return JSON.parse( device.info );
                } catch ( e ) {}
            }

            return undefined;
        };

        var resolveDeviceField = function (serverData, deviceInfoData) {
            if (serverData === deviceInfoData) {
                return serverData;
            } else if (serverData.length === 0 && deviceInfoData.length > 0) {
                return deviceInfoData;
            } else if (serverData.length > 0 && deviceInfoData.length === 0) {
                return serverData;
            } else {
                return deviceInfoData;
            }
        };

        return {
            getDevices: function(val) {
                return pluginTestsService.lookupDevices(val).$promise.then(function(response) {
                    if (response.status === 'OK') {
                        return response.data.map(function (device) {
                            var deviceInfo = getDeviceInfo(device);
                            var serverIMEI = device.imei || '';
                            var deviceInfoIMEI = deviceInfo ? (deviceInfo.imei || '') : '';
                            var resolvedIMEI = resolveDeviceField(serverIMEI, deviceInfoIMEI);

                            return device.name + (resolvedIMEI.length > 0 ? " / " + resolvedIMEI : "");
                        });
                    } else {
                        return [];
                    }
                });
            },
            deviceLookupFormatter: function(v) {
                if (v) {
                    var pos = v.indexOf('/');
                    if (pos > -1) {
                        return v.substr(0, pos).trim();
                    }
                }
                return v;
            }
        }
    }])
    .filter('status', function() {
        return function(input) {
            switch(input) {
                case 0:
                    return 'plugin.tests.status.sent';
                case 1:
                    return 'plugin.tests.status.delivered';
                case 2:
                    return 'plugin.tests.status.read';
            }
        };
    })
    .controller('PluginTestsTabController', function ($scope, $rootScope, $window, $location, $modal, $timeout, $interval,
                                                      pluginTestsService, getDevicesService, confirmModal,
                                                      authService, localization) {
        $scope.hasPermission = authService.hasPermission;

        $rootScope.settingsTabActive = false;
        $rootScope.pluginsTabActive = true;

        $scope.paging = {
            pageNum: 1,
            pageSize: 50,
            totalItems: 0,
            deviceFilter: '',
            messageFilter: '',
            status: -1,
            dateFrom: null,
            dateTo: null,
            sortValue: 'createTime'
        };

        $scope.$watch('paging.pageNum', function() {
            $window.scrollTo(0, 0);
        });

        var deviceNumber = ($location.search()).deviceNumber;
        if (deviceNumber) {
            $scope.paging.deviceFilter = deviceNumber;
        }
        $scope.dateFormat = localization.localize('format.date.plugin.tests.datePicker');
        $scope.createTimeFormat = localization.localize('format.date.plugin.tests.createTime');
        $scope.datePickerOptions = { 'show-weeks': false };
        $scope.openDatePickers = {
            'dateFrom': false,
            'dateTo': false
        };

        $scope.errorMessage = undefined;
        $scope.successMessage = undefined;

        $scope.getDevices = getDevicesService.getDevices;
        $scope.deviceLookupFormatter = getDevicesService.deviceLookupFormatter;

        $scope.openDateCalendar = function( $event, isStartDate ) {
            $event.preventDefault();
            $event.stopPropagation();

            if ( isStartDate ) {
                $scope.openDatePickers.dateFrom = true;
            } else {
                $scope.openDatePickers.dateTo = true;
            }
        };

        $scope.search = function () {
            $scope.errorMessage = undefined;

            if ($scope.paging.dateFrom && $scope.paging.dateTo) {
                if ($scope.paging.dateFrom > $scope.paging.dateTo) {
                    $scope.errorMessage = localization.localize('error.plugin.tests.date.range.invalid');
                    return;
                }
            }

            $scope.paging.pageNum = 1;
            loadData();
        };

        $scope.$watch('paging.pageNum', function () {
            loadData();
        });

        $scope.newMessage = function (message) {
            var modalInstance = $modal.open({
                templateUrl: 'app/components/plugins/tests/views/test.modal.html',
                controller: 'NewTestController',
                resolve: {
                    message: function () {
                        return message;
                    }
                }
            });

            modalInstance.result.then(function () {
                $scope.successMessage = localization.localize('plugin.tests.send.success');
                $timeout(function() { $scope.successMessage = undefined;}, 5000);
                $scope.search();
            });
        };

        var loading = false;
        var loadData = function () {
            $scope.errorMessage = undefined;

            if (loading) {
                console.log("Skipping query for message list since a previous request is pending");
                return;
            }

            loading = true;

            var request = {};
            for (var p in $scope.paging) {
                if ($scope.paging.hasOwnProperty(p)) {
                    request[p] = $scope.paging[p];
                }
            }

            request.deviceFilter = getDevicesService.deviceLookupFormatter(request.deviceFilter);

            pluginTestsService.getMessages(request, function (response) {
                loading = false;
                if (response.status === 'OK') {
                    $scope.messages = response.data.items;
                    $scope.paging.totalItems = response.data.totalItemsCount;
                } else {
                    $scope.errorMessage = localization.localizeServerResponse(response);
                }
            }, function () {
                loading = false;
                $scope.errorMessage = localization.localize('error.request.failure');
            })
        };

        loadData();

        var autoUpdateInterval = $interval(loadData, 15000);
        $scope.$on('$destroy', function () {
            if (autoUpdateInterval) $interval.cancel(autoUpdateInterval);
        });

    })

    .controller('PluginTestsSettingsController', function ($scope, $rootScope, $modal,
                                                               confirmModal, localization, pluginTestsService) {
        $scope.successMessage = undefined;
        $scope.errorMessage = undefined;

        $rootScope.settingsTabActive = true;
        $rootScope.pluginsTabActive = false;

        $scope.settings = {
            "testsPurgePeriod": 7
        };

        $scope.purge = function () {
            $scope.successMessage = undefined;
            $scope.errorMessage = undefined;

            if (isNaN($scope.settings.testsPurgePeriod)) {
                $scope.errorMessage = localization.localize('plugin.tests.settings.enter.number');
            }

            pluginTestsService.purgeOldMessages({"days": $scope.settings.testsPurgePeriod}, function (response) {
                if (response.status === 'OK') {
                    $scope.successMessage = localization.localize('plugin.tests.settings.test.purge.success');
                } else {
                    $scope.errorMessage = localization.localizeServerResponse(response);
                }
            });
        };
    })

    .controller('NewTestController', function ($scope, $rootScope, $modalInstance, configurationService, groupService,
                                                  confirmModal, localization, pluginTestsService, getDevicesService) {

        $scope.sending = false;

        $scope.getDevices = getDevicesService.getDevices;
        $scope.deviceLookupFormatter = getDevicesService.deviceLookupFormatter;

        groupService.getAllGroups(function (response) {
            $scope.groups = response.data;
        });

        configurationService.getAllConfigurations(function (response) {
            $scope.configurations = response.data;
        });

        $scope.test = {
            scope: "device",
            deviceNumber: "",
            groupId: "",
            configurationId: "",
            message: ""
        }

        $scope.send = function () {
            $scope.errorMessage = undefined;

            if ($scope.test.scope === 'device' && $scope.test.deviceNumber.trim() === '') {
                $scope.errorMessage = localization.localize('plugin.tests.error.empty.device');
                return;
            }

            if ($scope.test.scope === 'group' && !$scope.test.groupId) {
                $scope.errorMessage = localization.localize('plugin.tests.error.empty.group');
                return;
            }

            if ($scope.test.scope === 'configuration' && !$scope.test.configurationId) {
                $scope.errorMessage = localization.localize('plugin.tests.error.empty.configuration');
                return;
            }

            if ($scope.test.message.trim() === '') {
                $scope.errorMessage = localization.localize('plugin.tests.error.empty.text');
                return;
            }

            $scope.test.deviceNumber = getDevicesService.deviceLookupFormatter($scope.test.deviceNumber)

            $scope.sending = true;

            pluginTestsService.sendMessage($scope.test).$promise.then(function(response) {
                $scope.sending = false;
                if (response.status === 'OK') {
                    $modalInstance.close();
                } else {
                    $scope.errorMessage = localization.localizeServerResponse(response);
                }
            }, function () {
                $scope.sending = false;
                $scope.errorMessage = localization.localizeServerResponse('error.request.failure');
            });
        };

        $scope.closeModal = function () {
            $modalInstance.dismiss();
        };
    })

    .run(function ($rootScope, $location, localization) {
        $rootScope.$on('plugin-tests-device-selected', function (event, device) {
            $location.url('/plugin-tests?deviceNumber=' + device.number);
        })
        localization.loadPluginResourceBundles("tests");
    });


