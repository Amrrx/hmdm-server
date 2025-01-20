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
    })
    .controller('PluginTestsTabController', function ($rootScope) {

        $rootScope.settingsTabActive = false;
        $rootScope.pluginsTabActive = true;
    })
    .run(function (localization) {
        localization.loadPluginResourceBundles("tests");
    })
;
