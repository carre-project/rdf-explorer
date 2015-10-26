var app = angular.module('CarreExample', ['ngAnimate', 'ngTouch', 'cgBusy', 'ngCookies', 'ui.grid', 'ui.grid.cellNav', 'ui.grid.edit', 'ui.grid.resizeColumns', 'ui.grid.pinning', 'ui.grid.selection', 'ui.grid.moveColumns', 'ui.grid.exporter', 'ui.grid.grouping', 'ui.bootstrap']);
app.config(function($locationProvider) {
        $locationProvider.html5Mode(true);
    })
    .controller('MainCtrl', function($scope, $cookies, $http, uiGridGroupingConstants, $location) {

        //get test user token
        var testUser = {
            'oauth_token': '0213be219dc1821eb2f7b0bbc7c8a6cbe3c3559b',
            'username': 'nporto'
        };


        /*-----Integration with the authentication example --------AUTH-----*/

        //set up the urls 
        var CARRE_DEVICES = 'http://devices.carre-project.eu/devices/accounts';
        var baseUrl = $location.absUrl();
        $scope.loginUrl = CARRE_DEVICES + '/login?next=' + baseUrl;
        $scope.logoutUrl = CARRE_DEVICES + '/logout?next=' + baseUrl;


        // Retrieving a cookie and set initial user object
        $scope.user = $scope.cookie = $cookies.getObject('CARRE_USER') || testUser;

        // // Retrieving url params
        // var params = $location.search();

        // //check for cookie or url get parameters
        // if (params.login && params.username) {
        //     delete params.login; //delete the extra param we put before
        //     $scope.user = $scope.cookie = params; //set user object
        //     $cookies.putObject('CARRE_USER', $scope.cookie, {
        //         'domain': 'carre-project.eu'
        //     }); //set browser cookie
        // }
        // else if (params.logout) {
        //     $scope.user = $scope.cookie = null; //remove user object
        //     $cookies.remove('CARRE_USER', {
        //         'domain': 'carre-project.eu'
        //     }); //remove browser cookie
        // }

        // //clean up the browser url
        // $location.url('/').replace();


        /*-----------end of authentication --------AUTH---------------*/

        var TOKEN = $scope.user.oauth_token;
        var USERGRAPH = '<https://carre.kmi.open.ac.uk/users/' + $scope.user.username + '>';
        var PUBLICGRAPH = '<http://carre.kmi.open.ac.uk/beta>';
        var API = 'http://beta.carre-project.eu:5050/carre.kmi.open.ac.uk:443/ws/'; // http://carre.kmi.open.ac.uk:443/ws/


        /*------SPARQL QUERY METHOD----------*/
        $scope.sparql={
            rdfGraph:'public', //set the default request to public
            limit:100, //set the default limit to 100
            subjectFilter:'',
            predicateFilter:'',
            objectFilter:'',
            time:0.00,
            query:'',
            
        }

        $scope.sparqlRequest = function() {
            console.log('Request using SPARQL query method');
            var start = new Date().getTime(); //count the time for each request;
            
        
            var GRAPH = PUBLICGRAPH;
            if ($scope.sparql.rdfGraph === 'private' && TOKEN) {
                GRAPH = USERGRAPH;
            }

            //build string filters
            var FiltersArray=[];
            var SparqlFilters='';
            if($scope.sparql.subjectFilter) FiltersArray.push('regex(str(?subject),"' + $scope.sparql.subjectFilter + '","i")');
            if($scope.sparql.predicateFilter) FiltersArray.push('regex(str(?predicate),"' + $scope.sparql.predicateFilter + '","i")');
            if($scope.sparql.objectFilter) FiltersArray.push('regex(str(?object),"' + $scope.sparql.objectFilter + '","i")');
            if(FiltersArray.length>0){
                SparqlFilters='FILTER ( '+FiltersArray.join(' && ')+' )';
            }
            //example sparql query
            $scope.sparql.query = 'SELECT * FROM ' + GRAPH + ' WHERE { ?subject ?predicate ?object. ' + SparqlFilters + ' } LIMIT ' + ($scope.sparql.limit);
            console.log('Sparql query: ',$scope.sparql.query);

            //make request and assign the promise to a variable for loading features
            $scope.dataLoad = $http.post(API + 'query', {
                'sparql': $scope.sparql.query,
                'token': TOKEN
            }).success(function(data) {
                // console.log('Raw results: ', data);

                //convert raw results to ui-grid compatible data using map function
                $scope.mygrid.data = data.map(function(obj) {
                        var row = {};
                        row.predicate = obj.predicate.value;
                        row.subject = obj.subject.value;
                        row.object = obj.object.value;
                        row.predicate_pretty = row.predicate.substring(row.predicate.lastIndexOf('/') + 1);
                        row.subject_pretty = row.subject.substring(row.subject.lastIndexOf('/') + 1);
                        row.object_pretty = obj.object.value;

                        return row;
                    })
                    // console.log('Filtered : ', $scope.mygrid.data);
                var end=new Date().getTime();
                $scope.sparql.time=Math.round((end-start)/1000 * 100) / 100;
                console.log($scope.sparql.time);
            });

        };


        /*------INSTANCES METHOD----------*/
        $scope.instanceTypes = [
            'observable',
            'clinical_observable',
            'personal_observable',
            'risk_element',
            'biomedical_risk_element',
            'behavioural_risk_element',
            'genetic_risk_element',
            'demographic_risk_element',
            'risk_factor',
            'risk_evidence',
            'citation'
        ];
        $scope.selectedType = $scope.instanceTypes[0];

        $scope.instancesRequest = function(type) {
            console.log('Request using Instances method');
            //make request and assign the promise to a variable for loading features
            $scope.dataLoad = $http.get(API + 'instances?type=' + type).success(function(data) {
                console.log('Raw results: ', data[0]);

                //convert raw results to ui-grid compatible data using map function
                $scope.mygrid.data = data.map(function(obj) {
                        var row = {};
                        row.predicate = obj.predicate;
                        row.subject = obj.subject;
                        row.object = obj.object;
                        row.predicate_pretty = row.predicate.substring(row.predicate.lastIndexOf('/') + 1);
                        row.subject_pretty = row.subject.substring(row.subject.lastIndexOf('/') + 1);
                        row.object_pretty = obj.object;
                        return row;
                    })
                    // console.log('Filtered : ', $scope.mygrid.data);
            });

        };






        /* GRID STUFF */

        $scope.mygrid = {};
        $scope.mygrid.data = [];
        $scope.mygrid.enableColumnResizing = true;
        $scope.mygrid.enableFiltering = true;
        $scope.mygrid.enableGridMenu = true;
        $scope.mygrid.showGridFooter = true;
        $scope.mygrid.showColumnFooter = true;
        $scope.mygrid.fastWatch = true;
        $scope.mygrid.columnDefs = [{
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
            },
            grouping: {
                groupPriority: 1
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


    });
