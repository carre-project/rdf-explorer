var app = angular.module('CarreExample', ['ngAnimate', 'ngTouch', 'cgBusy', 'ngCookies', 'ui.grid', 'ui.grid.cellNav', 'ui.grid.edit', 'ui.grid.resizeColumns', 'ui.grid.pinning', 'ui.grid.selection', 'ui.grid.moveColumns', 'ui.grid.exporter', 'ui.grid.grouping', 'ui.bootstrap']);
app.config(function($locationProvider) {
        $locationProvider.html5Mode(true);
    })
    .controller('MainCtrl', function($scope, $cookies, $http, uiGridGroupingConstants, $location,Bioportal) {

        //clean up the browser url
        $location.url('/').replace();
        var baseUrl = $location.absUrl();
        
        //set up the urls 
        var API =  'http://devices.carre-project.eu:443/ws/'; //'http://beta.carre-project.eu:5050/carre.kmi.open.ac.uk:443/ws/';
        var PUBLICGRAPH = '<http://carre.kmi.open.ac.uk/beta>';
        var CARRE_DEVICES = 'http://devices.carre-project.eu/devices/accounts';
        $scope.loginUrl = CARRE_DEVICES + '/login?next=' + baseUrl;
        $scope.logoutUrl = CARRE_DEVICES + '/logout?next=' + baseUrl;

        /*-----Integration with the authentication example ------------*/
        
        // Retrieving a cookie and set initial user object
        var TOKEN = $cookies.get('CARRE_USER') || '';
        $scope.user={};

        //validate cookie token with userProfile api function and get username userGraph
        if(TOKEN.length>0) {
            $http.get(API+'userProfile?token='+TOKEN).then(function(res){
                $scope.user={
                    oauth_token:TOKEN,
                    username:res.data.username,
                    email:res.data.email
                };
            },function(err){
                $scope.user = {};
                console.log(err);
            });
        }
        
        /*-----------end of authentication -----------------------*/
        
        
        /*------SPARQL QUERY METHOD----------*/
        $scope.sparql={
            rdfGraph:'public', //set the default request to public
            limit:100, //set the default limit to 100
            subjectFilter:'',
            predicateFilter:'',
            objectFilter:'',
            time:0.00,
            query:'',
            extraPatterns: ''//'?subject rdf:type risk:risk_element.'
        }
        
        $scope.sparqlPrefixes= [
            "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>",
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
            "PREFIX sensors: <http://carre.kmi.open.ac.uk/ontology/sensors.owl#>",
            "PREFIX risk: <http://carre.kmi.open.ac.uk/ontology/risk.owl#>",
            "PREFIX carreManufacturer: <http://carre.kmi.open.ac.uk/manufacturers/>",
            "PREFIX carreUsers: <https://carre.kmi.open.ac.uk/users/>",
            "PREFIX educational: <http://carre.kmi.open.ac.uk/ontology/educational.owl#>",
            "PREFIX lifestyle: <http://carre.kmi.open.ac.uk/ontology/lifestyle.owl#>"
            ];
        $scope.sparqlRequest = function() {
            console.log('Request using SPARQL query method');
            var start = new Date().getTime(); //count the time for each request;
        
            var GRAPH = PUBLICGRAPH;
            if ($scope.sparql.rdfGraph === 'private' && $scope.user) {
                GRAPH = '<https://carre.kmi.open.ac.uk/users/' + $scope.user.username + '>';
            }
            //build string filters
            var FiltersArray=[];
            var SparqlFilters='';
            if($scope.sparql.subjectFilter) FiltersArray.push('regex(str(?subject),"' + $scope.sparql.subjectFilter + '","i")');
            if($scope.sparql.predicateFilter) FiltersArray.push('regex(str(?predicate),"' + $scope.sparql.predicateFilter + '","i")');
            if($scope.sparql.objectFilter) FiltersArray.push('regex(str(?object),"' + $scope.sparql.objectFilter + '","i")');
            if(FiltersArray.length>0){
                SparqlFilters=' FILTER ( '+FiltersArray.join(' && ')+' )';
            }
            //example sparql query
            $scope.sparql.query = "SELECT * FROM " + GRAPH + " WHERE { ?subject ?predicate ?object. "+$scope.sparql.extraPatterns+ SparqlFilters + "} LIMIT " + ($scope.sparql.limit);
            $scope.finalQuery = $scope.sparqlPrefixes.join("\n")+"\n"+$scope.sparql.query;
            console.log('Sparql query: ',$scope.finalQuery);
            //make request and assign the promise to a variable for loading features
            $scope.dataLoad = $http.post(API + 'query', {
                'sparql': $scope.finalQuery,
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
                // console.log($scope.sparql.time);
            });
        };

        /* Autocomplete sparql filters from bioportal CARRE ontologies : Educational, Lifestyle, Risk Factors*/
        $scope.getCARREterms=function(val){
            return Bioportal(val,{'also_search_properties':true,'ontologies':'MERA,MWLA,CARRE','suggest':true}).then(function(response){
              return response.data.collection.map(function(obj){
                return obj.prefLabel;
                });
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
                // console.log('Raw results: ', data[0]);

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
                    });
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


    })
    .service('Bioportal', function($http) {

  var apikey= 'a15281a9-d87d-4c0f-b7aa-31debe0f6449'; //you should get your own API key! it's free
  var apiurl = 'http://data.bioontology.org/search';

  //autocomplete fetch from bioportal
  return function(search,options) {
    return $http.get(
        apiurl
        +(options.include?'?include='+options.include:'?include=prefLabel')
        +(options.display_context?'&display_context=true':'&display_context=false')
        +(options.also_search_properties?'&also_search_properties=true':'&also_search_properties=false')
        +'&pagesize='+(!!options.pagesize?options.pagesize:'20')
        +(options.semantic_types?'&semantic_types='+options.semantic_types:'')
        +(options.cui?'&cui='+options.cui:'')
        +(options.subtree?'&ontology='+options.subtree:'')
        +(options.display_links?'&display_links=true':'&display_links=false')
        +(options.suggest?'&suggest=true':'&suggest=false')
        +(options.ontologies?'&ontologies='+options.ontologies:'&ontologies=ICD10,SNOMEDCT')
        +'&q='+search
        +'&apikey='+apikey
    );
  };

});
