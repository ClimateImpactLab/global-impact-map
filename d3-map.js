var periods = ["1986_2005", "2020_2039", "2040_2059", "2080_2099"];

(function($) {

  var
    baseWidth = 360,
    baseHeight = 173
    postData = {},
    globalPercentileSelect = $('div.acf-map-generator__controls select.global-dataset-percentile-list'),
    globalLowerLimit = $('div.acf-map-generator__controls input.global-lower-limit')
    globalUpperLimit = $('div.acf-map-generator__controls input.global-upper-limit'),
    globalDatasetLower = $('input.global-lower-limit__dataset'),
    globalDatasetUpper = $('input.global-upper-limit__dataset'),

    global_combo_variable = document.getElementById("combobox-variable"),
    global_combo_relative = document.getElementById("combobox-relative");
    global_slider_period = document.getElementById("period-slider");

  var
    // globalDatasets = './csv/tas_DJF_2040_2059_absolute_degC_percentiles.csv', // CHANGE THIS TO ANY DATASET YOUD LIKE TO GENERATE INTO CHOROPLETH
    regionalTopo = './topo/globalRegions.json'; // This is just the map json

  var div = d3.select("body").append("div")   
  .attr("class", "tooltip")               
  .style("opacity", 0);

  // Map generation
  var mapGenButton = $('button.generate-map');
  mapGenButton.on('click', function() {

    // Get selected dataset
    var selectedGlobalPercentile = globalPercentileSelect.val(),
        selected_variable = global_combo_variable.value,
        selected_relative = global_combo_relative.value,
        selected_period = periods[global_slider_period.value];

    var unit;

    if (selected_variable == 'tasmin') {
      unit = 'days-under-32F';
    } else if (selected_variable == 'tasmax') {
      unit = 'days-over-95F';
    } else {
      unit = 'degC';
    }

    var selectedGlobalDataset = (
          "./csv/"
          + selected_variable
          + "_" + selected_period
          + "_" + selected_relative
          + "_" + unit
          + "_percentiles.csv");

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
        minFive = 99999,
        minFifty = 99999,
        minNinetyFive = 99999,
        minProbability = 99999;
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
          'index': index,
          'hierid': hierid
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
      var color_palette = [
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
          ];

      var color = d3.scaleThreshold()
        .domain(d3.range(color_palette.length-1).map(function(i) {return (globalLowerLimitValue + (globalUpperLimitValue - globalLowerLimitValue)/(color_palette.length-2)*i)}))
        .range(color_palette);

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
          // .on('mouseover', function(d) {
          //   console.log('Region: ', d.properties);
          // });

          // ################################################
          // MIKE DELGADO'S CODE
          // 
          // OnHover tooltip -- diagnostic tool
          // Should be deleted before going live
          // 
          // from http://bl.ocks.org/KoGor/5685876
          // ################################################
          
          //Adding mouseevents
          .on("mouseover", function(d) {
            div.transition().duration(100)
            .style("opacity", 1)
            div.text(preppedGlobalDataset[d.properties.hierid]['hierid'] + " : " + preppedGlobalDataset[d.properties.hierid][selectedGlobalPercentile])
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY -30) + "px");
          })
          .on("mouseout", function() {
            div.transition().duration(100)
            .style("opacity", 0);
          });

          // ################################################
          // ################################################
          

          // ################################################
          // MIKE DELGADO'S CODE
          // 
          // legend -- diagnostic tool
          // Should be deleted before going live
          // 
          // from http://bl.ocks.org/KoGor/5685876
          // ################################################
           
          //Adding legend for our Choropleth


          var boxmargin = 4,
            lineheight = 8;
            keyheight = 6,
            keywidth = 10,
            boxwidth = 1.5 * keywidth;

          var title = ['Temperature','bins'],
              titleheight = title.length*lineheight + boxmargin;
    
          var margin = { "left": 10, "top": 10 };

          var ranges = color.range().length;

          // make legend 
          var legend = svg.append("g")
              .attr("transform", "translate (-170,-40)")
              .attr("class", "legend");
              
          legend.selectAll("text")
              .data(title)
              .enter().append("text")
              .attr("text-anchor", "middle")
              .attr("class", "legend-title")
              .attr("x",  keywidth + boxmargin)
              .attr("y", function(d, i) { return (i+1)*lineheight-2; })
              .text(function(d) { return d; })

          // make legend box 
          var lb = legend.append("rect")
              .attr("transform", "translate (0,"+titleheight+")")
              .attr("class", "legend-box")
              .attr("width", boxwidth)
              .attr("height", ranges*lineheight+2*boxmargin+lineheight-keyheight);

          // make quantized key legend items
          var li = legend.append("g")
              .attr("transform", "translate (8,"+(titleheight)+")")
              .attr("class", "legend-items");

          li.selectAll("rect")
              .data(color.range().map(function(thisColor) {
                var d = color.invertExtent(thisColor);
                if (d[0] == null) d[0] = color.domain()[0];
                if (d[1] == null) d[1] = color.domain()[1];
                return d;
              }))
              .enter().append("rect")
              .attr("y", function(d, i) { return i*lineheight+lineheight-keyheight; })
              .attr("width", keywidth)
              .attr("height", keyheight)
              .style("fill", function(d) { return color(d[0]); });
              
          li.selectAll("text")
              .data(color.domain())
              .enter().append("text")
              .attr("class", "legend-entry")
              .attr("x", keywidth + boxmargin)
              .attr("y", function(d, i) { return (i+1)*lineheight-2 + (lineheight*0.5); })
              .text(function(d) { return String(d); });

          // ################################################
          // ################################################

      });

    }); // End Map Gen

  }); // End CSV



})(jQuery);

var mapGenButton = $('button.generate-map');
var period_slider = document.getElementById("period-slider");
var period_value = document.getElementById("period-value");
period_slider.onchange = function() {
  period_value.innerHTML = periods[period_slider.value].replace("_", " to ");
}
