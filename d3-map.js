(function($) {

  var
    baseWidth = 360,
    baseHeight = 173
    postData = {},
    globalPercentileSelect = $('div.acf-map-generator__controls select.global-dataset-percentile-list'),
    globalLowerLimit = $('div.acf-map-generator__controls input.global-lower-limit')
    globalUpperLimit = $('div.acf-map-generator__controls input.global-upper-limit'),
    globalDatasetLower = $('input.global-lower-limit__dataset'),
    globalDatasetUpper = $('input.global-upper-limit__dataset');

  var
    globalDatasets = './csv/tas_DJF_2040_2059_absolute_degC_percentiles.csv', // CHANGE THIS TO ANY DATASET YOUD LIKE TO GENERATE INTO CHOROPLETH
    regionalTopo = './topo/globalRegions.json'; // This is just the map json


  // Map generation
  var mapGenButton = $('button.generate-map');
  mapGenButton.on('click', function() {

    // Get selected dataset
    var selectedGlobalDataset = globalDatasets,
        selectedGlobalPercentile = globalPercentileSelect.val();

        console.log(selectedGlobalDataset, selectedGlobalPercentile);

    // Map csv to something we like to use
    d3.csv(selectedGlobalDataset, function(error, data) {
      var currentGlobalDataset = data,
        preppedGlobalDataset = {},
        maxFive = 0,
        maxFifty = 0,
        maxNinetyFive = 0,
        maxProbability = 0,
        // We're assuming that mins should be 0 if is indeed higher
        // This is for the legend/keys
        minFive = 0,
        minFifty = 0,
        minNinetyFive = 0,
        minProbability = 0;
      $.each(currentGlobalDataset, function(index, value) {
        // Parse these for proper larger/less than
        var five = parseInt(value['0.05']),
          fifty = parseInt(value['0.5']),
          ninetyfive = parseInt(value['0.95']),
          hierid = value['hierid'];
        // We need to find the max of each %
        if ( five > maxFive ) maxFive = five;
        if ( fifty > maxFifty ) maxFifty = fifty;
        if ( ninetyfive > maxNinetyFive ) maxNinetyFive = ninetyfive;
        // We need to find the min of each %
        if ( five < minFive ) minFive = five;
        if ( fifty < minFifty ) minFifty = fifty;
        if ( ninetyfive < minNinetyFive ) minNinetyFive = ninetyfive;

        // console.log(minFive, minFifty, minNinetyFive);
        // See what the max total value is for the dataset
        preppedGlobalDataset[hierid] = {
          '0.05': five,
          '0.5': fifty,
          '0.95': ninetyfive,
          'index': index
        };
      });

      // See what the max total value is for the dataset
      maxProbability = Math.max.apply(Math,[maxFive, maxFifty, maxNinetyFive]);
      minProbability = Math.max.apply(Math,[minFive, minFifty, minNinetyFive]);
      console.log( 'Min: ', minProbability );
      console.log( 'Max: ', maxProbability );
      console.log( minProbability + (maxProbability * 0.25) );

      var globalLowerLimitValue = globalLowerLimit.val(),
        globalUpperLimitValue = globalUpperLimit.val();

      console.log( 'Defined Min: ', globalLowerLimitValue );
      console.log( 'Defined Max: ', globalUpperLimitValue );

      globalDatasetLower.val(minProbability);
      globalDatasetUpper.val(maxProbability);

      // This is where we want to work
      var color = d3.scaleThreshold()
        .domain(d3.range(globalLowerLimitValue, globalUpperLimitValue))
        .range(
          [
            '#2e8c93',
            '#55a0a6',
            '#7cb5b9',
            '#a4c9cc',
            '#cbdedf',
            '#d7c4cc',
            '#bd97a5',
            '#a2697f',
            '#883c58',
            '#6d0e32'
          ]
        );

      $('div.acf-map-generator__map-preview svg').remove();
      var svg = d3.select($('div.acf-map-generator__map-preview')[0]).append('svg');

      d3.json(regionalTopo, function(error, map) {
        if (error) throw error;
        var projection = d3.geoEquirectangular()
          .scale(baseWidth / 2 / Math.PI)
          .translate([0, 0]),
          path = d3.geoPath().projection(projection);

        svg
          .attr('width', baseWidth)
          .attr('height', baseHeight)
          .attr('viewBox', baseWidth / -2 + ' ' + baseHeight / -2 + ' ' + baseWidth + ' ' + baseHeight);

        svg.append("g")
          .attr("class", "regions")
          .selectAll("path")
          .data(topojson.feature(map, map.objects.cil3).features)
          .enter().append("path")
          .attr("fill", function(d) {
            if ( preppedGlobalDataset[d.properties.hierid] !== 'undefined' && preppedGlobalDataset[d.properties.hierid] !== undefined ) {
              // console.log( 'Found Region:', d.properties.hierid,  preppedGlobalDataset[d.properties.hierid]  );
              // If USA regions, ignore

              // if ( d.properties.hierid.substring(0, 3) === 'USA' ) {
              //   return '#bdbdbd';
              // } else {

                // console.log(preppedGlobalDataset[d.properties.hierid][selectedGlobalPercentile]);
                return color( preppedGlobalDataset[d.properties.hierid][selectedGlobalPercentile]  );

              // }

            } else {
              // console.log( 'Missing Region: ', d.properties.hierid  );
              return '#bdbdbd';
            }
          })
          .attr("d", path)
          .on('mouseover', function(d) {
            // console.log('Region: ', d.properties);
          });

      });

    }); // End Map Gen

  }); // End CSV



})(jQuery);
