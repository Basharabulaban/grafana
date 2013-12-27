define([
  'angular',
  'underscore',
  'config',
  'jquery'
],
function (angular, _, config, $) {
  'use strict';

  var module = angular.module('kibana.controllers');

  module.controller('SearchCtrl', function($scope, dashboard, keyboardManager, $element) {

    $scope.init = function() {
      $scope.elasticsearch = $scope.elasticsearch || {};
      $scope.giveSearchFocus = 0;
      $scope.selectedIndex = null;

      /*keyboardManager.bind('shift+s', function() {
        $element.find('.dropdown').addClass('open');
        $scope.giveSearchFocus += 1;
      });*/

      keyboardManager.bind('esc', function() {
        $element.find('.dropdown').removeClass('open');
      });
    };

    $scope.keyDown = function (evt) {
      if (evt.keyCode === 40) {
        $scope.selectedIndex = ($scope.selectedIndex || 0) + 1;
      }
    };

    $scope.elasticsearch_dashboards = function(queryStr) {
      dashboard.elasticsearch_list(queryStr + '*', 50).then(function(results) {
        if(_.isUndefined(results.hits)) {
          $scope.search_results = { dashboards: [] };
          return;
        }

        $scope.search_results = { dashboards: results.hits.hits };
      });
    };

    $scope.toggleImport = function ($event) {
      $event.stopPropagation();

      $scope.showImport = !$scope.showImport;
    };

    $scope.elasticsearch_dblist = function(queryStr) {
      $scope.showImport = false;

      queryStr = queryStr.toLowerCase();

      if (queryStr.indexOf('m:') !== 0) {
        $scope.elasticsearch_dashboards(queryStr);
        return;
      }

      queryStr = queryStr.substring(2, queryStr.length);

      var words = queryStr.split(' ');
      var query = $scope.ejs.BoolQuery();
      var terms = _.map(words, function(word) {
        return $scope.ejs.MatchQuery('metricPath_ng', word).boost(1.2);
      });

      var ngramQuery = $scope.ejs.BoolQuery();
      ngramQuery.must(terms);

      var fieldMatchQuery = $scope.ejs.FieldQuery('metricPath', queryStr + "*").boost(1.2);
      query.should([ngramQuery, fieldMatchQuery]);

      var request = $scope.ejs.Request().indices(config.grafana_index).types('metricKey');
      var results = request.query(query).size(20).doSearch();

      results.then(function(results) {
        if (results && results.hits && results.hits.hits.length > 0) {
          $scope.search_results = { metrics: results.hits.hits };
        }
        else {
          $scope.search_results = { metric: [] };
        }
      });
    };

    $scope.openSearch = function () {
      $scope.giveSearchFocus = $scope.giveSearchFocus + 1;
      $scope.elasticsearch_dblist("");
    };

    $scope.addMetricToCurrentDashboard = function (metricId) {
      dashboard.current.rows.push({
        title: '',
        height: '250px',
        editable: true,
        panels: [
          {
            type: 'graphite',
            title: 'test',
            span: 12,
            targets: [ { target: metricId } ]
          }
        ]
      });
    };

  });



  module.directive('xngFocus', function() {
    return function(scope, element, attrs) {
      $(element).click(function(e) {
        e.stopPropagation();
      });

      scope.$watch(attrs.xngFocus,function (newValue) {
        setTimeout(function() {
          newValue && element.focus();
        }, 200);
      },true);
    };
  });

});