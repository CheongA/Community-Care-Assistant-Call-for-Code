// See LICENSE.MD for license information.

// add angular grid
// https://www.ag-grid.com/best-angularjs-grid/
// https://plnkr.co/edit/?p=preview&preview
agGrid.initialiseAgGridWithAngular1(angular);

//var app = angular.module('MEANapp', ['ngRoute', 'ngStorage']);
var app = angular.module('MEANapp', ['ngRoute', 'ngStorage', 'agGrid', 'highcharts-ng']);
//var app = angular.module('MEANapp', ['ngRoute', 'ngStorage', 'agGrid']);

/*********************************
 Controllers
 *********************************/

app.controller('HeaderController', function($scope, $localStorage, $sessionStorage, $location, $http){

    // Set local scope to persisted user data
    $scope.user = $localStorage;

    // Logout function
    $scope.logout = function(){
        $http({
            //method: 'GET',
            method: 'POST',
            data: $localStorage,
            url: '/account/logout'
        })
            .success(function(response){
                alert(response);
                $localStorage.$reset();
                $location.path('/');
            })
            .error(function(response){
                alert(response);
                $location.path('/account/login');
            }
        );
    };
});

app.controller('HomeController', function($scope, $localStorage, $sessionStorage){});

app.controller('LoginController', function($scope, $localStorage, $sessionStorage, $location, $http){

    // Login submission
    $scope.submitLogin = function(){

        // Login request
        $http({
            method: 'POST',
            url: '/account/login',
            data: {
                    'username': $scope.loginForm.username,
                    'password': $scope.loginForm.password
                }
            })
            .success(function(response){
                // $localStorage persists data in browser's local storage (prevents data loss on page refresh)
                $localStorage.status = true;
                $localStorage.user = response;
                $location.path('/');
            })
            .error(function(){
                alert('Login failed. Check username/password and try again.');
            }
        );
    };

    // Redirect to account creation page
    $scope.createAccount = function(){
        $location.path('/account/create');
    }
});

app.controller('CreateAccountController', function($scope, $localStorage, $sessionStorage, $http, $location){

    // Create account
    $scope.submitForm = function(){
        $http({
            method: 'POST',
            url: '/account/create',
            data: {
                    'username': $scope.newUser.username,
                    'password': $scope.newUser.password,
                    'name' : $scope.newUser.name,
                    'email' : $scope.newUser.email
                }
            })
            .success(function(response){
                alert(response);
                $location.path('/account/login');
            })
            .error(function(response){
                // When a string is returned
                if(typeof response === 'string'){
                    alert(response);
                }
                // When array is returned
                else if (Array.isArray(response)){
                    // More than one message returned in the array
                    if(response.length > 1){
                        var messages = [],
                            allMessages;
                        for (var i = response.length - 1; i >= 0; i--) {
                            messages.push(response[i]['msg']);
                            if(response.length == 0){
                                allMessages = messages.join(", ");
                                alert(allMessages);
                                console.error(response);
                            }
                        }
                    }
                    // Single message returned in the array
                    else{
                        alert(response[0]['msg']);
                        console.error(response);
                    }
                }
                // When something else is returned
                else{
                    console.error(response);
                    alert("See console for error.");
                }
            }
        );

    };
});

app.controller('AccountController', function($scope, $localStorage, $sessionStorage, $http, $location){

    // Create static copy of user data for form usage (otherwise any temporary changes will bind permanently to $localStorage)
    $scope.formData = $.extend(true,{},$localStorage.user);

    // Update user's account with new data
    $scope.updateAccount = function(){
        $http({
            method: 'POST',
            url: '/account/update',
            data: {
                'username': $scope.formData.username,
                'password': $scope.password,
                'name' : $scope.formData.name,
                'email' : $scope.formData.email
            }
        })
            .success(function(response){
                $localStorage.user = $scope.formData;
                alert(response);
            })
            .error(function(response){
                // When a string is returned
                if(typeof response === 'string'){
                    alert(response);
                }
                // When an array is returned
                else if (Array.isArray(response)){
                    // More than one message returned in the array
                    if(response.length > 1){
                        var messages = [],
                            allMessages;
                        for (var i = response.length - 1; i >= 0; i--) {
                            messages.push(response[i]['msg']);
                            if(response.length == 0){
                                allMessages = messages.join(", ");
                                alert(allMessages);
                                console.error(response);
                            }
                        }
                    }
                    // Single message returned in the array
                    else{
                        alert(response[0]['msg']);
                        console.error(response);
                    }
                }
                // When something else is returned
                else{
                    console.error(response);
                    alert("See console for error.");
                }
            }
        );
    };

    // Delete user's account
    $scope.deleteAccount = function(){
        var response = confirm("Are you sure you want to delete your account? This cannot be undone!");
        if(response == true){
            $http({
                method: 'POST',
                url: '/account/delete',
                data: {
                    'username': $scope.formData.username
                }
            })
                .success(function(response){
                    $localStorage.$reset();
                    alert(response);
                    $location.path('/');
                })
                .error(function(response){
                    alert(response);
                }
            );
        }
    };
});

app.controller('ProtectedController', function($scope, $localStorage, $location, $http){
  $scope.chartConfig3 = {
    chart: {
      height: 400,
      width: 450,
      backgroundColor: 'transparent'
    },
    credits: {
      enabled: false
    },
    navigator: {
      enabled: true,
      series: {
        data: []
      }
    },
    plotOptions: {
      series: {
        lineWidth: 1,
        fillOpacity: 0.5

      },
      column: {
        stacking: 'normal'
      },
      area: {
        stacking: 'normal',
        marker: {
          enabled: false
        }
      }
    },
    exporting: false,
    xAxis: [{
      type: 'datetime'
    }],
    yAxis: [
      { // Primary yAxis

        min: 0,
        allowDecimals: false,
        title: {
          text: 'Number of Helps',
          style: {
            color: '#80a3ca'
          }
        },
        labels: {
          format: '{value}',
          style: {
            color: '#80a3ca'
          }
        }
      }
    ],
    title: {
      text: 'Helps over Time'
    },
    loading: false,
    legend: {enabled:true},
    tooltip: {
      crosshairs: [
        {
          width: 1,
          dashStyle: 'dash',
          color: '#898989'
        },
        {
          width: 1,
          dashStyle: 'dash',
          color: '#898989'
        }
      ],
      headerFormat: '<div class="header">{point.key}</div>',
      pointFormat: '<div class="line"><div class="circle" style="background-color:{series.color};float:left;margin-left:10px!important;clear:left;"></div><p class="country" style="float:left;">{series.name}</p><p>{point.y:,.0f} {series.tooltipOptions.valueSuffix} </p></div>',
      borderWidth: 1,
      borderRadius: 5,
      borderColor: '#a4a4a4',
      shadow: false,
      useHTML: true,
      percentageDecimals: 2,
      backgroundColor: "rgba(255,255,255,.7)",
      style: {
        padding: 0
      },
      shared: true
    },
    series: [
      {
        id: 'Food',
        name: 'Food: ',
        data: [[1426204800000, 22], [1426464000000, 16], [1426550400000, 10], [1426636800000, 13]],
        type: 'column',
        yAxis: 0,
        //color: '#40a3da'
      },
      {
        id: 'Shelter',
        name: 'Shelter: ',
        data: [[1426204800000, 12], [1426464000000, 6], [1426550400000, 10], [1426636800000, 3]],
        type: 'column',
        yAxis: 0,
        //color: '#80a3ca'
      }
    ]
  };

  $scope.chartConfig2 = {
    chart: {
        width:450,
        height:400,
        plotBackgroundColor: null,
        plotBorderWidth: null,
        plotShadow: false,
        type: 'pie'
    },
    credits: {
      enabled: false
    },
    title: {
        text: 'Helps by Type'
    },
    tooltip: {
        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
    },
    accessibility: {
        point: {
            valueSuffix: '%'
        }
    },
    plotOptions: {
        pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            dataLabels: {
                enabled: true,
                format: '<b>{point.name}</b>: {point.percentage:.1f} %'
            }
        }
    },
    series: [{
        name: 'Help Type',
        colorByPoint: true,
        data: [{
            name: 'Food',
            y: 61.41,
            sliced: true,
            selected: true
        }, {
            name: 'Shelter',
            y: 11.84
        }, {
            name: 'Transportation',
            y: 10.85
        }, {
            name: 'COVID',
            y: 4.67
        }, {
            name: 'Financial',
            y: 4.18
        }, {
            name: 'Addiction',
            y: 1.64
        }, {
            name: 'Counseling',
            y: 1.6
        }, {
            name: 'Healthcare',
            y: 1.2
        }, {
            name: 'Other',
            y: 2.61
        }]
    }]
   };

    // specify the columns
    var columnDefs = [
      {headerName: "Phone", field: "phone", rowGroup:true},
      {headerName: "Date", field: "receivedAt"},
      {headerName: "Type", field: "category"},
      {headerName: "Text", field: "source"}
    ];
  $scope.chartConfig1 = {
    chart: {
        width:450,
        height:400,
        plotBackgroundColor: null,
        plotBorderWidth: null,
        plotShadow: false,
        type: 'pie'
    },
    credits: {
      enabled: false
    },
    title: {
        text: 'Helps by County'
    },
    tooltip: {
        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
    },
    accessibility: {
        point: {
            valueSuffix: '%'
        }
    },
    plotOptions: {
        pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            dataLabels: {
                enabled: true,
                format: '<b>{point.name}</b>: {point.percentage:.1f} %'
            }
        }
    },
    series: [{
        name: 'County',
        colorByPoint: true,
        data: [{
            name: 'Chrome',
            y: 61.41,
            sliced: true,
            selected: true
        }, {
            name: 'Santa Clara',
            y: 11.84
        }, {
            name: 'San Francisco',
            y: 10.85
        }, {
            name: 'San Mateo',
            y: 4.67
        }, {
            name: 'Alameda',
            y: 4.18
        }, {
            name: 'Contra Costa',
            y: 1.64
        }, {
            name: 'Marin',
            y: 1.6
        }, {
            name: 'Yolo',
            y: 1.2
        }, {
            name: 'Other',
            y: 2.61
        }]
    }]
   };

    // specify the columns
    var columnDefs = [
      {headerName: "Phone", field: "phone", hide:true, rowGroup:true},
      //{headerName: "Date", field: "receivedAt", maxWidth:150},
      {headerName: "Type", field: "category"},
      {headerName: "Text", field: "source"},
      {headerName: "City", field: "city"},
      {headerName: "County", field: "county"}
    ];
    /*
    var columnDefs = [
      {headerName: "Make", field: "make", rowGroup:true},
      //{headerName: "Model", field: "model"},
      {headerName: "Price", field: "price"}
    ];
    */

    var autoGroupColumnDef = {
      sort:'desc',
      headerName: "",
      field: "receivedAt",
      cellRenderer:'agGroupCellRenderer',
      comparator: function(valueA, valueB, nodeA, nodeB, isInverted) {
        //console.log('A: ',nodeA);
        //console.log('B: ',nodeB);
        //return valueA - valueB;
        return nodeA.allChildrenCount - nodeB.allChildrenCount;
      },
      sortable:true,
      cellRendererParams: {
        checkbox: false
      }
    };
    /*
    var autoGroupColumnDef = {
      headerName: "Model",
      field: "model",
      cellRenderer:'agGroupCellRenderer',
      cellRendererParams: {
        checkbox: true
      }
    };
    */

    // specify the data
    /*var rowData = [
      {make: "Toyota", model: "Celica", price: 25000},
      {make: "Toyota", model: "Supra", price: 55000},
      {make: "Toyota", model: "Camry", price: 30000},
      {make: "Ford", model: "Mondeo", price: 32000},
      {make: "Ford", model: "Cortina", price: 42000},
      {make: "Ford", model: "Granada", price: 92000},
      {make: "Ford", model: "Escort", price: 22000},
      {make: "Ford", model: "Mondeo", price: 32000},
      {make: "Porsche", model: "Boxter", price: 72000}
    ];*/

    // let the grid know which columns and what data to use
    $scope.gridOptions = {
      columnDefs: columnDefs,
      autoGroupColumnDef: autoGroupColumnDef,
      groupSelectsChildren: true,
      rowSelection: 'multiple'
      //,rowData: rowData
    };

    $http({
        //method: 'GET',
        method: 'POST',
        data: $localStorage,
        url: '/protected'
    })
        .success(function(response){
            $scope.message = 'As of '+(new Date())+'.  Please widen your browser window for better viewing.';
            var length=(response&&response.length)||0;
            // chartConfig1: County: {name:'Santa Clara', y: count}
            // chartConfig2: Help Type: {name:'Food', y: count}
            // chartConfig3: County: [{}, {}] where {} looks like:
            //{
              //id: 'Food',
              //name: 'Food: ',
              //data: [[1426204800000, 22], [1426464000000, 16], [1426550400000, 10], [1426636800000, 13]],
              //type: 'column',
              //yAxis: 0,
              //color: '#40a3da'
            //},
            var county={}, helpType={};
            for(var i=0, d, dateV; i<length;i++) {
                d = response[i];
                d.receivedAt = moment(d.receivedAt).format('L');
                dateV = moment(new Date(d.receivedAt /*no time, just date*/)).valueOf() +'';
                if (county[d.county]) 
                    county[d.county]+=1;
                else
                    county[d.county]=1;
                if (helpType[d.category]) {
                    if (helpType[d.category][dateV])
                        helpType[d.category][dateV]+=1;
                    else
                        helpType[d.category][dateV]=1;
                }
                else {
                    helpType[d.category]={};
                    helpType[d.category][dateV]=1;
                }
            }
            var countyData=[];
            for(var k in county) {
                countyData.push({name:k, y:county[k]})
            }
            var helpTypeData=[], helpTypeDateData=[];
            for(var k in helpType) {
                var data=[], cnt=0;
                for(var dateV in helpType[k]) {
                    data.push([parseInt(dateV), helpType[k][dateV]]);
                    cnt += helpType[k][dateV];
                }
                helpTypeDateData.push({id:k, name:k, type:'column', data:data});
                helpTypeData.push({name:k, y:cnt});
            }
            $scope.chartConfig1.getChartObj().series[0].setData(countyData);
            $scope.chartConfig2.getChartObj().series[0].setData(helpTypeData);
            // https://www.highcharts.com/forum/viewtopic.php?t=40780
            $scope.chartConfig3.getChartObj().update({series:helpTypeDateData}, true, true);
            $scope.gridOptions.api.setRowData(response);
        })
        .error(function(response){
            alert(response);
            $location.path('/account/login');
        }
    );

});

/*********************************
 Routing
 *********************************/
app.config(function($routeProvider) {
    'use strict';

    $routeProvider.

        //Root
        when('/', {
            templateUrl: 'views/home.html',
            controller: 'HomeController'
        }).

        //Login page
        when('/account/login', {
            templateUrl: 'views/login.html',
            controller: 'LoginController'
        }).

        //Account page
        when('/account', {
            templateUrl: 'views/account.html',
            controller: 'AccountController'
        }).

        //Create Account page
        when('/account/create', {
            templateUrl: 'views/create_account.html',
            controller: 'CreateAccountController'
        }).

        //Protected page
        when('/protected', {
            templateUrl: 'views/protected.html',
            controller: 'ProtectedController'
        });

});
