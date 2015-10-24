var app = angular.module('app', ['ngAnimate', 'ui.bootstrap','ngTouch', 'cgBusy', 'ngCookies', 'ui.grid', 'ui.grid.cellNav', 'ui.grid.edit', 'ui.grid.resizeColumns', 'ui.grid.pinning', 'ui.grid.selection', 'ui.grid.moveColumns', 'ui.grid.exporter', 'ui.grid.importer', 'ui.grid.grouping']);

app.controller('MainCtrl', function($cookieStore, $scope, $http, $timeout, $interval, uiGridConstants, uiGridGroupingConstants) {

        //get user token
        $scope.user = $cookieStore.get('CARRE_USER') || {
            'oauth_token': '0213be219dc1821eb2f7b0bbc7c8a6cbe3c3559b',
            'username': 'nporto'
        };
        var TOKEN = $scope.user.oauth_token;
        var USERGRAPH = '<https://carre.kmi.open.ac.uk/users/' + $scope.user.username + '>';
        var API = 'https://carre.kmi.open.ac.uk:443/ws/query';


        $scope.sparqlRequest = function(type) {
            $scope.radioModel=type;
            var GRAPH = '<http://carre.kmi.open.ac.uk/beta>'
            if (type === 'private' && TOKEN) {
                GRAPH = USERGRAPH;
            }
            var SPARQL = 'SELECT * FROM ' + GRAPH + ' WHERE { ?subject ?predicate ?object }';
            $scope.dataLoad = $http.post(API, {
                'sparql': SPARQL,
                'token': TOKEN
            }).success(function(data) {
                // console.log('Raw results: ', data);
                $scope.gridOptions.data = data.map(function(obj, index) {
                    var row = {};
                    row.predicate = obj.predicate.value;
                    row.subject = obj.subject.value;
                    row.object = obj.object.value;
                    row.predicate_pretty = row.predicate.substring(row.predicate.lastIndexOf('/') + 1);
                    row.subject_pretty = row.subject.substring(row.subject.lastIndexOf('/') + 1);
                    row.object_pretty = row.object.substring(row.object.lastIndexOf('/') + 1);
                    return row;
                })
                // console.log('Filtered : ', $scope.gridOptions.data);
            });

        };

        $scope.sparqlRequest('private');



        /* GRID STUFF */

        $scope.gridOptions = {};
        $scope.gridOptions.enableColumnResizing = true;
        $scope.gridOptions.enableFiltering = true;
        $scope.gridOptions.enableGridMenu = true;
        $scope.gridOptions.showGridFooter = true;
        $scope.gridOptions.showColumnFooter = true;
        $scope.gridOptions.fastWatch = true;
        $scope.gridOptions.columnDefs = [{
            name: 'subject_pretty',
            displayName: 'Subject',
            enableCellEdit: true,
            cellTooltip: function(row, col) {
                return row.entity.subject;
            },
            grouping: {
                groupPriority: 0
            }
        }, {
            name: 'predicate_pretty',
            displayName: 'Predicate',
            enableCellEdit: true,
            cellTooltip: function(row, col) {
                return row.entity.predicate;
            }
        }, {
            name: 'object_pretty',
            displayName: 'Object',
            enableCellEdit: true,
            cellTooltip: function(row, col) {
                return row.entity.object;
            }
        }];

        /*End of Grid stuff*/


    }
]);
