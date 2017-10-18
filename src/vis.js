//TODO Add examples for the following graph types:
// KDE
// Histogram
// Box plot
// Mean + error
// Violin plot
// Horizon chart
// Beeswarm
// Wheat plot
// Stem/leaf
// Lasagna plot
// Dot plot

//Let's make a distribution. Metaphor here is dropping samples into a space.
//This distribution should be convex. We'll only be allowing drops in [0,1],
//and only displaying [0,1], but KDEs etc might extend past these bounds.
var distribution = [];
var kde = [];

var dropping = false;
var epsilon = 0.001;

var vises = [];
var width,x;
var y = d3.scaleLinear().domain([0,1]).range([100,0]);


/*
Stats utility functions
*/


//Gaussian kernel

function gaussian(mu,sigma) {
  var gauss = {};
  gauss.mu = mu;
  gauss.sigma = sigma;
  gauss.pdf = function(x){
    var exp = Math.exp(Math.pow(x-gauss.mu, 2) / (-2 * Math.pow(gauss.sigma, 2)));
    return (1 / (gauss.sigma * Math.sqrt(2*Math.PI))) * exp;
  };
  return gauss;
}

//Silverman's rule of thumb for KDE bandwidth selection.

function bandwidthEstimate(dist) {
  var sigma = dl.stdev(dist);

  //something suitably nice when we've only got one value
  if(sigma==0){
    sigma = 1;
  }

  var n = dist.length;
  var silverman =  Math.pow((4*Math.pow(sigma,5)/(3*n)),0.2);
  return silverman;
}

//Our density at a particular point, based on our kde
function density(x) {
  var y = 0;
  for(var i = 0; i<kde.length; i++){
    y+= kde[i].pdf(x);
  }
  return y;
}

//Sturges' rule of thumb for histogram bin size selection.

function binEstimate(dist) {
  var n = dist.length;
  return Math.ceil(Math.log2(n))+1;
}

var tableauBlue = "#1f447d";
var tableauOrange = "#e8762c";
var tableauGray = "#333";

function setup() {
  d3.select("#dropper").on("click",drop);
  window.addEventListener("resize",resize);
  resize();
  vises.push(stripChart);
  vises.push(dotplot);
  vises.push(kdeChart);
  vises.push(gradient);
  vises.push(violin);
  vises.push(beeswarm);
  vises.push(histogram);
  vises.push(boxWhisker);
  vises.push(meanError);
  for(var vis of vises){
    vis.make();
  }
}

//Wilkinson linear sweep for dot plots

function dotPlotBin(data,markSize) {
  var bins = [];
  var curx = x(0);
  var curIndex = -1;
  var dX;
  for(var i = 0;i<data.length;i++){
    dX = x(data[i]);
    if(i==0 || dX>curx+markSize){
      curIndex++;
      bins[curIndex] = {"value": data[i], "count": 1, "sum" : data[i]};
    }
    else{
      bins[curIndex].count++;
      bins[curIndex].sum+= data[i];
      bins[curIndex].value = bins[curIndex].sum / bins[curIndex].count;
    }
    curx = x(bins[curIndex].value);
  }
  return bins;
}

function drop() {
  var duration = 250;
  if(!dropping) {
    dropping = true;
    var coords = d3.mouse(this);
    d3.select("#cursor").style("opacity",1);
    d3.select("#cursor").style("left",coords[0]+"px");
    d3.select("#cursor")
      .transition()
      .duration(duration)
        .style("opacity",0);
    var x = coords[0]/width;
    distribution.push(x);
    var sigma = bandwidthEstimate(distribution);
    kde.push(gaussian(x,sigma));
    for(var gauss of kde){
        gauss.sigma = sigma;
    }

    for(var vis of vises){
      vis.update();
    }
    setTimeout(function(){ dropping = false;}, duration);
  }
}

function resize() {
  width = parseInt(d3.select("#dropper").style("width"));
  x = d3.scaleLinear().domain([0,1]).range([0,width]);

  for(var vis of vises){
    vis.update();
  }

  var height = window.innerHeight
   || document.documentElement.clientHeight
   || document.body.clientHeight;

  var margin = d3.select("#header").node().getBoundingClientRect().height;
  d3.select("#vises")
   .style("max-height",(height-margin-10)+"px")
   .style("margin-top",(margin+10)+"px");

}

/*
Chart drawing
*/

var boxWhisker = {};

boxWhisker.make = function() {
  var div = d3.select("#vises").append("div");
  div.append("div").classed("title",true).html("Box + Whiskers");
  var svg = div.append("svg").attr("id","box");

  svg.append("rect")
  .classed("left",true)
  .attr("x",function(d){ return x(0.5);})
  .attr("y",function(d){ return y(0.75);})
  .attr("width", function(d){ return 0;})
  .attr("height", function(d){ return y(0.5);})
  .style("fill","white")
  .style("stroke",tableauGray)
  .style("stroke-width",4);

  svg.append("rect")
  .classed("right",true)
  .attr("x",function(d){ return x(0.5);})
  .attr("y",function(d){ return y(0.75);})
  .attr("width", function(d){ return 0;})
  .attr("height", function(d){ return y(0.5);})
  .style("fill","white")
  .style("stroke",tableauGray)
  .style("stroke-width",4);

  svg.append("line")
  .classed("left",true)
  .attr("x1",function(d){ return x(0.5);})
  .attr("y1",function(d){ return y(0.5);})
  .attr("x2",function(d){ return x(0.5);})
  .attr("y2",function(d){ return y(0.5);})
  .style("stroke",tableauGray)
  .style("stroke-width",4);

  svg.append("line")
  .classed("right",true)
  .attr("x1",function(d){ return x(0.5);})
  .attr("y1",function(d){ return y(0.5);})
  .attr("x2",function(d){ return x(0.5);})
  .attr("y2",function(d){ return y(0.5);})
  .style("stroke",tableauGray)
  .style("stroke-width",4);
}

boxWhisker.update = function() {
  if(distribution.length>0){
    var qs = dl.quartile(distribution);
    var iqr = qs[2]-qs[0];

    var svg = d3.select("#box");

    svg.select("rect.left")
      .transition()
      .attr("width", function(d){ return x(qs[1] - qs[0]);})
      .attr("x",function(d){ return x(qs[0]);});

    svg.select("rect.right")
      .transition()
      .attr("x",function(d){ return x(qs[1]);})
      .attr("width", function(d){ return x(qs[2] - qs[1]);});

    svg.select("line.left")
      .transition()
      .attr("x1",function(d){ return x(qs[0]-(1.5*iqr));})
      .attr("x2",function(d){ return x(qs[0]);});

    svg.select("line.right")
      .transition()
      .attr("x1",function(d){ return x(qs[2]+(1.5*iqr));})
      .attr("x2",function(d){ return x(qs[2]);});
  }
}

var histogram = {};

histogram.make = function(){
  var div = d3.select("#vises").append("div");
  div.append("div").classed("title",true).html("Histogram");
  var svg = div.append("svg").attr("id","histogram");
}

histogram.update = function(){
  if(distribution.length>0){
    var bins = dl.histogram(distribution,{step: 1/binEstimate(distribution)});
    var by = d3.scaleLinear().domain([0,dl.max(bins,"count")]).range([100,4]);

    svg = d3.select("#histogram");
    var bars = svg.selectAll("rect").data(bins,function(d){ return d.value});

    bars.exit().remove();

    bars
    .transition()
    .attr("x",function(d) { return x(d.value);})
    .attr("y",function(d) { return by(d.count);})
    .attr("width",function(d){ return x(bins.bins.step);})
    .attr("height",function(d){ return y(0) - by(d.count);});

    bars.enter().append("rect")
    .attr("x",function(d) { return x(d.value);})
    .attr("y",function(d) { return by(d.count);})
    .attr("width",function(d){ return x(bins.bins.step);})
    .attr("height",function(d){ return y(0) - by(d.count);})
    .attr("fill",tableauGray);

  }
}

var kdeChart = {};

kdeChart.make = function(){
  var div = d3.select("#vises").append("div");
  div.append("div").classed("title",true).html("Density Chart");
  var svg = div.append("svg").attr("id","density");

  svg.append("path")
  .attr("stroke",tableauGray)
  .attr("stroke-width",4)
  .attr("fill","white")
  .classed("density",true);

}

kdeChart.update = function(){
  if(distribution.length>0){
    var xs = dl.range(0,1,epsilon);
    var data = [];
    for(var i = 0;i<xs.length;i++){
      data.push({"x": xs[i], "y" : density(xs[i])});
    }
    var by = d3.scaleLinear().domain([0,dl.max(data,"y")]).range([100,4]);

    var area = d3.area()
      .x(function(d){ return x(d.x);})
      .y(function(d){ return by(d.y);});

    var svg = d3.select("#density");
    svg.select("path.density").datum(data)
      .transition()
      .attr("d",area);
  }
}

var stripChart = {};

stripChart.make = function(){
  var div = d3.select("#vises").append("div");
  div.append("div").classed("title",true).html("Strip Chart");
  var svg = div.append("svg").attr("id","strip");
}

stripChart.update = function(){
  if(distribution.length>0){
    var svg = d3.select("#strip");
    svg.selectAll("rect").data(distribution).enter().append("rect")
      .attr("opacity",0.7)
      .attr("fill",tableauGray)
      .attr("width",4)
      .attr("height",100)
      .attr("y",0);

    svg.selectAll("rect")
      .attr("x",function(d){ return x(d);});
  }
}

function Horizon() {
}

var beeswarm = {};

beeswarm.make = function(){
  var div = d3.select("#vises").append("div");
  div.append("div").classed("title",true).html("Beeswarm Chart");
  var svg = div.append("svg").attr("id","beeswarm");
}

beeswarm.update = function(){
  if(distribution.length>0){
    var markSize = parseInt(d3.select("#dotplot").select("circle").attr("r"));
    var data = [];
    for(var i = 0;i<distribution.length;i++){
      data.push({"value": distribution[i]});
    }

    y.clamp(true);
    x.clamp(true);
    var simulation = d3.forceSimulation(data)
      .force("x", d3.forceX(function(d) { return x(d.value);}).strength(1))
      .force("y", d3.forceY(function(d) { return y(0.5);}))
      .force("collide", d3.forceCollide(markSize+1))
      .stop();

    for(var i = 0;i<120;i++){
      simulation.tick();
    }

    y.clamp(false);
    x.clamp(false);
    var svg = d3.select("#beeswarm");

    svg.selectAll("circle").data(data).enter().append("circle");

    svg.selectAll("circle")
      .transition()
      .attr("cx",function(d){ console.log(d.x); return d.x;})
      .attr("cy",function(d){ return d.y;})
      .attr("r",markSize+"px")
      .attr("fill",tableauGray);
  }
}

var dotplot = {};

dotplot.make = function(){
  var div = d3.select("#vises").append("div");
  div.append("div").classed("title",true).html("Dot Plot");
  var svg = div.append("svg").attr("id","dotplot");
}

dotplot.update = function(){
  if(distribution.length>0){
    var markSize = 15;
    var bins;
    var maxD;
    var fits;
    var data = distribution.sort();
    do{
      markSize--;
      bins = dotPlotBin(data,markSize);
      maxD = dl.max(bins,"count");
      fits = maxD*(2*markSize) <=100;
    }while(!fits && markSize>=3);

    var svg = d3.select("#dotplot");

    svg.selectAll("g").data(bins).enter().append("g");

    svg.selectAll("g")
      .transition()
      .attr("transform",function(d){ return "translate("+x(d.value)+")";});

    var dots = svg.selectAll("g").selectAll("circle").data(function(d,i){
      var data = [];
      for(var j=1;j<=d.count;j++){
        data.push({"bin": i, "row": j});
      }
      return data;
    }, function(d){ return d.bin+","+d.row;});

    dots.exit().remove();

    dots
      .attr("cx",0)
      .attr("cy",function(d){ return 100-((d.row)*(2*markSize));})
      .attr("r",markSize+"px")
      .attr("fill",tableauGray);

    dots.enter().append("circle")
      .attr("cx",0)
      .attr("cy",function(d){ return 100-((d.row)*(2*markSize));})
      .attr("r",markSize+"px")
      .attr("fill",tableauGray);


  }
}

var gradient = {};

gradient.make = function(){
  var div = d3.select("#vises").append("div");
  div.append("div").classed("title",true).html("Gradient Chart");
  var svg = div.append("svg").attr("id","gradient");
  var xs = dl.range(0,1,epsilon);
  var data = [];
  for(var i = 0;i<xs.length;i++){
    data.push({"x": xs[i], "y" : 0});
  }

  var cwidth = (width/data.length);

  svg.selectAll("rect").data(data).enter().append("rect")
    .attr("x",function(d,i){ return Math.floor(x(d.x));})
    .attr("y",function(d){ return y(1);})
    .attr("width",function(d){ return Math.ceil(cwidth);})
    .attr("height",function(d){ return y(0)-y(1);})
    .attr("fill","white")
    .attr("stroke-width",0);
}

gradient.update = function(){
  if(distribution.length>0){
    var xs = dl.range(0,1,epsilon);
    var data = [];
    for(var i = 0;i<xs.length;i++){
      data.push({"x": xs[i], "y" : density(xs[i])});
    }

    var svg = d3.select("#gradient");
    var cwidth = (width/data.length);
    var by = d3.scaleLinear().domain([0,dl.max(data,"y")]).range(["white",tableauGray]);

    svg.selectAll("rect").data(data);

    svg.selectAll("rect")
      .attr("x",function(d,i){ return Math.floor(x(d.x));})
      .attr("width",function(d){ return Math.ceil(cwidth);})
      .transition()
      .attr("fill",function(d){ return by(d.y);});
  }
}

var meanError = {};

meanError.make = function(){
  var div = d3.select("#vises").append("div");
  div.append("div").classed("title",true).html("Mean + Error Bars");
  var svg = div.append("svg").attr("id","mean");

  svg.append("line")
    .classed("error",true)
    .attr("x1",function(d){ return x(0.5);})
    .attr("x2",function(d){ return x(0.5);})
    .attr("y1",function(d){ return y(0.5);})
    .attr("y2",function(d){ return y(0.5);})
    .attr("stroke",tableauGray)
    .attr("stroke-width",4);

  svg.append("circle")
    .classed("mean",true)
    .attr("cx",function(d){ return -10;})
    .attr("cy",function(d) { return y(0.5);})
    .attr("r",function(d) { return y(0.5)-y(0.6);})
    .attr("fill",tableauGray);

}

meanError.update = function(){
  if(distribution.length>0){
    var svg = d3.select("#mean");

    var mean = dl.mean(distribution);
    var error = dl.z.ci(distribution);

    svg.select("line.error")
      .transition()
      .attr("x1",function(d){ return x(error[0]);})
      .attr("x2",function(d){ return x(error[1]);});

    svg.select("circle.mean")
      .transition()
      .attr("cx",function(d){ return x(mean);});
  }
}

var violin = {};

violin.make = function(){
  var div = d3.select("#vises").append("div");
  div.append("div").classed("title",true).html("Violin Chart");
  var svg = div.append("svg").attr("id","violin");

  svg.append("path")
  .attr("fill",tableauGray)
  .classed("top",true);

  svg.append("path")
  .attr("fill",tableauGray)
  .classed("bottom",true);

  svg.append("rect")
  .classed("left",true)
  .attr("x",function(d){ return x(0.5);})
  .attr("y",function(d){ return y(0.5)-5;})
  .attr("width", 0)
  .attr("height", "10px")
  .style("fill","white")
  .style("stroke",tableauGray)
  .style("stroke-width",4);

  svg.append("rect")
  .classed("right",true)
  .attr("x",function(d){ return x(0.5);})
  .attr("y",function(d){ return y(0.5)-5;})
  .attr("width", 0)
  .attr("height", "10px")
  .style("fill","white")
  .style("stroke",tableauGray)
  .style("stroke-width",4);


}

violin.update = function(){
  if(distribution.length>0){
    var xs = dl.range(0,1,epsilon);
    var data = [];
    for(var i = 0;i<xs.length;i++){
      data.push({"x": xs[i], "y" : density(xs[i])});
    }

    var Ty = d3.scaleLinear().domain([0,dl.max(data,"y")]).range([50,4]);

    var TArea = d3.area()
      .x(function(d){ return x(d.x);})
      .y1(function(d){ return Ty(d.y);})
      .y0(50);

    var By = d3.scaleLinear().domain([0,dl.max(data,"y")]).range([50,96]);

    var BArea = d3.area()
      .x(function(d){ return x(d.x);})
      .y1(function(d){ return By(d.y);})
      .y0(50);

    var svg = d3.select("#violin");
    svg.select("path.top").datum(data)
      .transition()
      .attr("d",TArea);

    svg.select("path.bottom").datum(data)
      .transition()
      .attr("d",BArea);

    var qs = dl.quartile(distribution);

    svg.select("rect.left")
      .transition()
      .attr("width", function(d){ return x(qs[1] - qs[0]);})
      .attr("x",function(d){ return x(qs[0]);});

    svg.select("rect.right")
      .transition()
      .attr("x",function(d){ return x(qs[1]);})
      .attr("width", function(d){ return x(qs[2] - qs[1]);});

  }
}
