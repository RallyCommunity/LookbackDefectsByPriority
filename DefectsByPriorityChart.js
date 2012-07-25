(function() {
    var Ext = window.Ext4 || window.Ext;

	var lumenize = require('./lumenize');
	//var lumenize = Rally.data.lookback.Lumenize;

    // TODO make this configurable
    var openStates = ["Submitted", "Open"];

    //TODO remove when new url format online
    Ext.define('Rally.data.lookback.SnapshotStoreOldUrl', {
        extend: 'Rally.data.lookback.SnapshotStore',

        constructor: function(config) {
            this.callParent([config]);
            // temporary override needed since new URL format not deployed yet
            this.proxy.url = Rally.environment.getServer().getLookbackUrl(1.37) + '/' +
                    Rally.util.Ref.getOidFromRef(this.context.workspace) + '/artifact/snapshot/query';
        },
    });
    
	Ext.define('Rally.ui.chart.DefectsByPriorityChart', {
        extend: 'Rally.ui.chart.Chart',
    	alias: 'widget.rallydefectsbyprioritychart',

    	config: {
    		defectsByPriorityConfig: {
                startDate: null,
                endDate: null
    		},

            storeType: 'Rally.data.lookback.SnapshotStoreOldUrl',

        	/**
             * @cfg {Object} chartConfig The HighCharts chart config defining all remaining chart options.
             * Full documentation here: [http://www.highcharts.com/ref/](http://www.highcharts.com/ref/)
             */
            chartConfig: {
                chart: {
                    defaultSeriesType: 'column',
                    zoomType: 'x'
                },
                legend: {
                    enabled: false
                },
                xAxis: {
                    categories: [],
                    tickmarkPlacement: 'on',
                    tickInterval: 1,
                    title: {
                        enabled: 'Priority'
                    }
                    
                },
                tooltip: {
                    formatter: function() {
                        return '' + this.x + '<br />' + this.series.name + ': ' + this.y;
                    }
                },
                plotOptions : {
			  		column: {
				  		color: '#F00'                              
			  		},
		  		},
                series: []
            },

            /**
             * @cfg {Object} storeConfig The configuration used to filter the data
             * retrieved from the Lookback API
             */
            storeConfig: {
                sorters: [
                    {
                        property: 'ObjectID',
                        direction: 'ASC'
                    },
                    {
                        property: '_ValidFrom',
                        direction: 'ASC'
                    }
                ],
                hydrate: ['Priority'],
                fetch: ['ObjectID', 'Priority'],

                // look for snapshots of defects that changed State
                filters: [
                    { property: '_Type', value: 'Defect' },
                    { property: 'State', operator: 'in', value: openStates },
                    { property: '_PreviousValues.State', operator: 'exists', value: true }
                ],
                limit: Infinity
            }
		},

		//TODO
		/*
		colorMap: {
            'High Attention': '#FF0000',
            
        },
        */

        constructor: function(config) {
            this.callParent(arguments);

            this.getDefectAllowedValues();

            var projectOID = new Rally.util.Ref(this.storeConfig.context.project).getOid();

            // get snapshots that happened during the date range in the current project
            this.storeConfig.filters = Ext.Array.union(this.storeConfig.filters, [
                {
                    property: '_ValidFrom',
                    operator: '>=',
                    value: Rally.util.DateTime.toIsoString(this.defectsByPriorityConfig.startDate, true)
                },
                {
                    property: '_ValidFrom',
                    operator: '<',
                    value: Rally.util.DateTime.toIsoString(this.defectsByPriorityConfig.endDate, true)
                },
                {
                    property: 'Project',
                    value: projectOID
                }
            ]);
        },

        getDefectAllowedValues: function(){
            var queryUrl = "https://rally1.rallydev.com/slm/webservice/1.36/typedefinition.js"
            
            var params = {
                query: '( Name = "Defect" )',
                fetch: 'ObjectID,Name,Attributes,AllowedValues',
                start: '1',
                pagesize: '1'
            };
        
            var callback = Ext.bind(this.extractAllowedValues, this);
            Ext.Ajax.request({
                url: queryUrl,
                method: 'GET',
                params: params,
                withCredentials: true,
                success: function(response){
                    var text = response.responseText;
                    var json = Ext.JSON.decode(text);
                    callback(json.QueryResult.Results[0]);
                }
            });
        },

        extractAllowedValues: function(defectTypeDef){
            var stateAttDef = Ext.Array.filter(defectTypeDef.Attributes, function(attribute){
                return attribute.Name == "Priority";
            }, null)[0];

            this.allowedValues = Ext.Array.pluck(stateAttDef.AllowedValues, "StringValue");

            console.log("allowed values loaded: "+ this.allowedValues);
            if(this.allowdValues && this.storeLoaded){
                this.onStoreLoad(this.store);
            }
        },

        /**
         * Called when the store has been loaded
         *
         * @template
         */
        onStoreLoad: function(store) {
            this.storeLoaded = true;
            console.log("store loaded ");
            if(this.allowedValues){
                console.log("calling parent onStoreLoad()");
                this.callParent([store]);
            }

        },

        /**
         * @inheritdoc
         * @param store
         * @param results
         */
        prepareChartData: function(store, results) {
            var chartData = this.calculatePrioritiesData(results);
            this.chartConfig.xAxis.categories = chartData.categories;
            this.chartConfig.series.push(chartData.series);
        },

        calculatePrioritiesData: function(results){
            var uniques = this.getUniqueSnapshots(results);

        	var groupBySpec = {
	        	groupBy: 'Priority',
	        	aggregations: [
	        		{
	        			field: 'ObjectID',
	        			f: '$count'
	        		}
	        	]

	        };
        
        	var groups = lumenize.groupBy(uniques, groupBySpec);
        	var series = this.convertGroupingsToSeries(groups);
        	//var categories = this.getCategories(groups);

    		return {
                series: series,
                categories: this.allowedValues
            };
        },

        /**
         * Assumes that results is sorted on ObjectID ASC and then _ValidFrom ASC in order to get last
         * unique snapshot for each ObjectID.
         */
        getUniqueSnapshots: function(results){
            var uniques = [];
            var lastResult = null;
            var l = results.length;
            for(var i=0; i < l; ++i){
                result = results[i];
                var oid = result.ObjectID;
                if(lastResult != null && oid != lastResult.ObjectID){
                    uniques.push(lastResult);
                }
                lastResult = result;
            }
            // make sure we get the last one
            if(lastResult != null){
                uniques.push(lastResult);
            }

            return uniques;
        },

        /*
        getCategories: function(groups){
	        var categories = [];
	        for(var group in groups){
	            if( groups.hasOwnProperty(group) ){
	                categories.push(group);
	            }
	        }
	        return categories;
	    },
        */
    
	    convertGroupingsToSeries: function(groups){

	    	var data = [];
	    	
            var l = this.allowedValues.length;
	    	for(var i=0; i < l; ++i){
	    		var allowedValue = this.allowedValues[i];
                if(groups[allowedValue]){
	    			data.push( groups[allowedValue]['ObjectID_$count'] );
	    		}
                else{
                    data.push(0);
                }
	    	}
	    	
	    	return {
	    		type : 'column',
	    		data: data,
	    		name: 'Priority Counts'
	    	};
	    }
	});
})();