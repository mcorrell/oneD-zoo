//TODO Add examples for the following graph types:
// X KDE
// X Histogram
// X Box plot
// X Mean + error
// X Violin plot
// X Beeswarm
// X Dot plot
// X Two-tone pseudo-coloring/horizon chart
// X Wheat plot
// Stem/leaf
// Letter-value plot?

//Let's make a distribution. Metaphor here is dropping samples into a space.
//This distribution should be convex. We'll only be allowing drops in [0,1],
//and only displaying [0,1], but KDEs etc might extend past these bounds.



/*
Stats utility functions
*/

//array of values in [0,1]
var distribution = [];

//all of the kernels used for making our kde/density estimates
var kde = [];

//all of the visualizations we'll be using
var vises = [];

//scales
var width, x;
const height = 40;
var y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

//sampling bandwidth for our kde, gradient plot, etc.
const epsilon = 0.001;

//style options
const tableauBlue = "#4e79a7";
const tableauOrange = "#e8762c";
const tableauGray = "#333";

const fillColor = tableauBlue;

var dropping = false;

/*
Stats utility functions
*/


//Gaussian kernel
function gaussian(mu = 0.5, sigma = 1) {
  let gauss = {};
  gauss.mu = mu;
  gauss.sigma = sigma;
  gauss.pdf = function(x){
    const exp = Math.exp(Math.pow(x - gauss.mu, 2) / (-2 * Math.pow(gauss.sigma, 2)));
    return (1 / (gauss.sigma * Math.sqrt(2 * Math.PI))) * exp;
  };
  return gauss;
}

//Initialize to non-empty if needed
function defaultData(n = 50) {
  const data = dl.random.normal(0.5, 0.25).samples(n);
  data.forEach(function(d){
    addPoint(d,false);
  });

  updateAll();
}

function addData(data) {
  data.forEach(function(d){
    addPoint(d,false);
  });

  updateAll();
}

//Silverman's rule of thumb for KDE bandwidth selection.
function bandwidthEstimate(dist) {
  let sigma = dl.stdev(dist);

  //something suitably nice when we've only got one value
  if(sigma == 0){
    sigma = 1;
  }

  const n = dist.length;
  return Math.pow((4 * Math.pow(sigma, 5) / (3 * n)), 0.2);
}

//Our density at a particular point, based on our kde
function density(x) {
  return kde.reduce((y, k) => y + k.pdf(x), 0);
}

//Sturges' rule of thumb for histogram bin size selection.
function binEstimate(dist) {
  const n = dist.length;
  return Math.ceil(Math.log2(n)) + 1;
}

//Wilkinson linear sweep for dot plots
function dotPlotBin(data, markSize) {
  let bins = [];
  let curx = x(0);
  let curIndex = -1;
  let dX;
  for(var i = 0;i < data.length;i++){
    dX = x(data[i]);
    if(i == 0 || dX > curx + (2 * markSize)){
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

/*
Setup and event handling
*/

function setup() {
  d3.select("#dropper").on("click", drop);
  window.addEventListener("resize", resize);
  resize();
  vises.push(stripChart);
  vises.push(dotplot);
  vises.push(beeswarm);
  vises.push(wheatplot);
  vises.push(boxWhisker);
  vises.push(meanError);
  vises.push(histogram);
  vises.push(kdeChart);
  vises.push(gradient);
  vises.push(twoTone);
  vises.push(violin);

  vises.forEach(function(v){
    v.make();
  });

}

function drop() {
  const duration = 250;
  if(!dropping) {
    dropping = true;
    const coords = d3.mouse(this);
    d3.select("#cursor").style("opacity", 1);
    d3.select("#cursor").style("left", `${coords[0]}px`);
    d3.select("#cursor")
      .transition()
      .duration(duration)
        .style("opacity",0);
    const x = coords[0] / width;
    addPoint(x);
    setTimeout(function(){ dropping = false;}, duration);
  }
}

function addPoint(x,update = true) {
  x = Math.min(Math.max(x, 0), 1);
  distribution.push(x);
  const sigma = bandwidthEstimate(distribution);
  kde.push(gaussian(x, sigma));

  for(let gauss of kde){
    gauss.sigma = sigma;
  }

  if(update){
    updateAll();
  }
}

function updateAll(){
  for(let vis of vises) {
    vis.update();
  }
}

function resize() {
  width = parseInt(d3.select("#dropper").style("width"));
  x = d3.scaleLinear().domain([0, 1]).range([0, width]);

  updateAll();

  const wheight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

  const margin = d3.select("#header").node().getBoundingClientRect().height;

  d3.select("#vises")
   .style("max-height",(wheight - margin - 20)+"px")
   .style("margin-top",(margin + 10)+"px");
}

/*
Chart drawing

Each chart is an object that gets added to our array of vizzes.

Each chart object needs a make() function that initializes it to some reasonable state for when there's no data, and an update() function that takes into account whatever data is in the distribution array.
update is called both on new data being added and the window being resized.
*/


//Box and Whisker Chart
var boxWhisker = {};

boxWhisker.make = function() {
  let div = d3.select("#vises").append("div");
  div.append("div").classed("title",true).html("Box + Whiskers");
  let svg = div.append("svg").attr("id", "box").classed("vis",true);

  svg.append("rect")
  .classed("left", true)
  .attr("x", x(0.5))
  .attr("y", y(0.75))
  .attr("width", 0)
  .attr("height", y(0.5))
  .style("fill", "white")
  .style("stroke", fillColor)
  .style("stroke-width", 4);

  svg.append("rect")
  .classed("right", true)
  .attr("x", x(0.5))
  .attr("y", y(0.75))
  .attr("width", 0)
  .attr("height", y(0.5))
  .style("fill", "white")
  .style("stroke", fillColor)
  .style("stroke-width", 4);

  svg.append("line")
  .classed("left", true)
  .attr("x1", x(0.5))
  .attr("y1", y(0.5))
  .attr("x2", x(0.5))
  .attr("y2", y(0.5))
  .style("stroke", fillColor)
  .style("stroke-width", 4);

  svg.append("line")
  .classed("right", true)
  .attr("x1", x(0.5))
  .attr("y1", y(0.5))
  .attr("x2", x(0.5))
  .attr("y2", y(0.5))
  .style("stroke", fillColor)
  .style("stroke-width", 4);

};

boxWhisker.update = function() {
  if(distribution.length > 0) {
    const qs = dl.quartile(distribution);
    const iqr = qs[2] - qs[0];

    let svg = d3.select("#box");

    svg.select("rect.left")
      .transition()
      .attr("width", x(qs[1] - qs[0]))
      .attr("x", x(qs[0]));

    svg.select("rect.right")
      .transition()
      .attr("x", x(qs[1]))
      .attr("width", x(qs[2] - qs[1]));

    svg.select("line.left")
      .transition()
      .attr("x1", x(qs[0]-(1.5*iqr)))
      .attr("x2", x(qs[0]));

    svg.select("line.right")
      .transition()
      .attr("x1", x(qs[2]+(1.5*iqr)))
      .attr("x2", x(qs[2]));
  }
};

//Histogram
var histogram = {};

histogram.make = function(){
  let div = d3.select("#vises").append("div");
  div.append("div").classed("title", true).html("Histogram");
  div.append("svg").attr("id", "histogram").classed("vis",true);
};

histogram.update = function(){
  if(distribution.length > 0){
    const bins = dl.histogram(distribution, {step: 1 / binEstimate(distribution)});
    const by = d3.scaleLinear().domain([0, dl.max(bins, "count")]).range([height, 4]);

    let svg = d3.select("#histogram");
    let bars = svg.selectAll("rect").data(bins, d => d.value);

    bars.exit().remove();

    bars
    .transition()
    .attr("x", d => Math.floor(x(d.value)))
    .attr("y", d => by(d.count))
    .attr("width", Math.ceil(x(bins.bins.step)))
    .attr("height", d => height - by(d.count));

    bars.enter().append("rect")
    .attr("x", d => Math.floor(x(d.value)))
    .attr("y", d => by(d.count))
    .attr("width", Math.ceil(x(bins.bins.step)))
    .attr("height", d => height - by(d.count))
    .attr("fill", fillColor);
  }
};

//Density Chart aka Kernel Density Estimate
var kdeChart = {};

kdeChart.make = function() {
  let div = d3.select("#vises").append("div");
  div.append("div").classed("title",true).html("Density Chart");
  let svg = div.append("svg").attr("id","density").classed("vis",true);

  svg.append("path")
  .attr("stroke", fillColor)
  .attr("stroke-width", 4)
  .attr("fill", "white")
  .classed("density", true);

};

kdeChart.update = function() {
  if(distribution.length>0) {
    const xs = dl.range(0, 1, epsilon);
    const data = xs.map(d => ({"x": d, "y": density(d)}));
    const by = d3.scaleLinear().domain([0, dl.max(data,"y")]).range([height, 4]);

    const area = d3.area()
      .x(d => x(d.x))
      .y(d => by(d.y));

    let svg = d3.select("#density");
    svg.select("path.density").datum(data)
      .transition()
      .attr("d", area);
  }
};

//Strip Chart where each sample is represented by a tall rectangular mark.
var stripChart = {};

stripChart.make = function() {
  let div = d3.select("#vises").append("div");
  div.append("div").classed("title",true).html("Strip Chart");
  div.append("svg").attr("id", "strip").classed("vis",true);
};

stripChart.update = function() {
  if(distribution.length > 0){
    let svg = d3.select("#strip");
    svg.selectAll("rect").data(distribution).enter().append("rect")
      .attr("opacity", 0.7)
      .attr("fill", fillColor)
      .attr("width", 4)
      .attr("height", height)
      .attr("y", 0);

    svg.selectAll("rect")
      .attr("x",d => x(d));
  }
};

//Beeswarm chart where each sample is a dot that uses some layout algorithm (in this case a force-directed layout) to cluster together such that no dots overlap, but the dots are as close to their intended x positions as possible.
var beeswarm = {};

beeswarm.make = function() {
  let div = d3.select("#vises").append("div");
  div.append("div").classed("title", true).html("Beeswarm Chart");
  div.append("svg").attr("id", "beeswarm").classed("vis",true);
};

beeswarm.update = function() {
  if(distribution.length > 0) {
    const markSize = parseInt(d3.select("#dotplot").select("circle").attr("r"));
    let data = distribution.map(d => ({"value": d}));

    y.clamp(true);
    x.clamp(true);
    var simulation = d3.forceSimulation(data)
      .force("x", d3.forceX(d => x(d.value)).strength(1))
      .force("y", d3.forceY(y(0.5)))
      .force("collide", d3.forceCollide(markSize + 1))
      .stop();

    for(let i = 0;i < 120;i++){
      simulation.tick();
    }

    y.clamp(false);
    x.clamp(false);

    let svg = d3.select("#beeswarm");

    svg.selectAll("circle").data(data).enter().append("circle");

    svg.selectAll("circle")
      .transition()
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", markSize)
      .attr("fill", fillColor);
  }
};

//A Wilkinson Dot plot where each sample is a circle that, if it would overplot another circle, is instead stacked on top of it.
var dotplot = {};

dotplot.make = function(){
  var div = d3.select("#vises").append("div");
  div.append("div").classed("title",true).html("Dot Plot");
  div.append("svg").attr("id", "dotplot").classed("vis",true);
};

dotplot.update = function(){
  if(distribution.length>0){
    let markSize = 15;
    let bins;
    let maxD;
    let fits;
    const data = distribution.sort();
    //Iteratively search for the largest mark size that would result in the points still "fitting" in our y region.
    do{
      markSize--;
      bins = dotPlotBin(data, markSize);
      maxD = dl.max(bins, "count");
      fits = maxD * (2 * markSize) <= height;
    }while(!fits && markSize>=3);

    let svg = d3.select("#dotplot");

    svg.selectAll("g").data(bins).enter().append("g");

    svg.selectAll("g")
      .transition()
      .attr("transform",d => "translate("+x(d.value)+")");

    let dots = svg.selectAll("g").selectAll("circle").data(function(d, i){
      let data = [];
      for(let j=1;j <= d.count;j++){
        data.push({"bin": i, "row": j});
      }
      return data;
    }, d => d.bin+","+d.row);

    dots.exit().remove();

    dots
      .attr("cx",0)
      .attr("cy",d => height-((d.row) * (2 * markSize)) + markSize)
      .attr("r",markSize)
      .attr("fill",fillColor);

    dots.enter().append("circle")
      .attr("cx",0)
      .attr("cy",d => height-((d.row)*(2 * markSize)) + markSize)
      .attr("r",markSize)
      .attr("fill",fillColor);
  }
};

//A Stephen Few Wheat Plot
var wheatplot = {};

wheatplot.make = function(){
  const div = d3.select("#vises").append("div");
  div.append("div").classed("title", true).html("Wheat Plot");
  div.append("svg").attr("id", "wheatplot").classed("vis", true);
};

wheatplot.update = function(){
  const bins = d3.histogram().thresholds(binEstimate(distribution))(distribution);
  const maxDots = dl.max(bins, d => d.length);
  const markHeight = Math.min(30, (height - 4) / maxDots);
  let markSize = markHeight / 2;

  if(bins.length > 1){
    const binWidth = x(bins[0].x1) - x(bins[0].x0);
    markSize = Math.min(markSize, binWidth);
  }

  const by = d3.scaleLinear().domain([0, maxDots]).range([height - (markHeight / 2), 4 + (markHeight / 2)]);

  const svg = d3.select("#wheatplot");

  const stalks = svg.selectAll("g").data(bins);

  const makeLeaves = function(binData){
    const leaves = d3.select(this).selectAll("circle").data(binData);

    leaves.exit().remove();

    leaves
      .transition()
      .attr("cx", d => x(d))
      .attr("cy", (d, i) => by(i))
      .attr("r", markSize)
      .attr("fill", fillColor);

    leaves.enter().append("circle")
      .attr("cx", d => x(d))
      .attr("cy", (d, i) => by(i))
      .attr("r", markSize)
      .attr("fill", fillColor);
  };

  stalks.exit().remove();

  stalks.enter().append("g").each(makeLeaves);

  stalks.each(makeLeaves);

};

//A gradient chart where we encode density from our KDE as color.
var gradient = {};

gradient.make = function(){
  let div = d3.select("#vises").append("div");
  div.append("div").classed("title", true).html("Gradient Chart");
  let svg = div.append("svg").attr("id", "gradient").classed("vis", true);
  const xs = dl.range(0,1,epsilon);
  const data = xs.map(d => ({"x": d, "y": 0}));

  svg.selectAll("rect").data(data).enter().append("rect")
    .attr("x",d => Math.floor(x(d.x)))
    .attr("width", Math.ceil(x(epsilon)))
    .attr("y",0)
    .attr("height", height)
    .attr("fill", "white")
    .attr("stroke", "none");
};

gradient.update = function(){
  if(distribution.length>0){
    const xs = dl.range(0,1,epsilon);
    const data = xs.map(d => ({"x": d, "y": density(d)}));

    let svg = d3.select("#gradient");
    const by = d3.scaleLinear().domain([0,dl.max(data,"y")]).range(["white",fillColor]);

    svg.selectAll("rect").data(data)
      .attr("x",d => Math.floor(x(d.x)))
      .attr("width", Math.ceil(x(epsilon)));

    svg.selectAll("rect")
      .attr("x",d => Math.floor(x(d.x)))
      .attr("width", Math.ceil(x(epsilon)))
      .transition()
      .attr("fill",d => by(d.y));
  }
};

//A two-tone color chart aka a horizon chart.
//Two ways of conceptualizing this one: either we have a banded color scheme where each x position has two colors, and the height of the second color is how far along the band that it is...
//Or, the conceptually easier way, which is that we have a density chart, but we slice it into layers, color each layer darker and darker depending on its y value, and then stack all the slices on top of eachother.
var twoTone = {};

twoTone.make = function(){
  let div = d3.select("#vises").append("div");
  div.append("div").classed("title", true).html("Horizon Chart");
  let svg = div.append("svg").attr("id", "twotone").classed("vis", true);
  const xs = dl.range(0,1,epsilon);
  const data = xs.map(d => ({"x": d, "y": 0}));

  let bins = svg.selectAll("rect").data(data).enter().append("g");

  bins.append("rect")
    .datum(function(d){ return d;})
    .attr("x", d => Math.floor(x(d.x)))
    .attr("width", Math.ceil(x(epsilon)))
    .attr("y", 0)
    .attr("height", height)
    .attr("fill", "white")
    .attr("stroke-width", 0);

  bins.append("rect")
    .datum(function(d){ return d;})
    .attr("x", d => Math.floor(x(d.x)))
    .attr("width", Math.ceil(x(epsilon)))
    .attr("y", 0)
    .attr("height", height)
    .attr("fill", "white")
    .attr("stroke-width", 0);
};

twoTone.update = function() {
  if(distribution.length > 0){
    const bands = 5;

    const xs = dl.range(0,1,epsilon);
    const data = xs.map(d => ({"x": d, "y": density(d)}));

    const squash = d3.scaleLinear().domain([0, dl.max(data,"y")]);
    const quantize = d3.scaleQuantize().domain([0, 1]).range(dl.range(0 ,bands, 1));
    const hy = d3.scaleLinear().domain([0, 1 / bands]).range([0, 1]);
    const by = d3.scaleLinear().domain([0, 1]).range(["white", fillColor]);

    let svg = d3.select("#twotone");

    let c1, c2, val, intVal, remain, topH, botH;

    svg.selectAll("g").data(data).each(function (d) {
      val = squash(d.y);
      intVal = quantize(val)/bands;
      d3.select(this).selectAll("rect").datum(d);
      const top = d3.select(this.firstChild);
      const bottom = d3.select(this.lastChild);

      remain = Math.max(val - intVal, 0);
      c1 = by(intVal);
      c2 = by(Math.min((quantize(val) + 1), bands) / bands);

      topH = Math.round(height * hy(remain));
      botH = height - topH;

      top
        .attr("x", d => Math.floor(x(d.x)))
        .attr("width", Math.ceil(x(epsilon)))
        .attr("y", botH)
        .attr("height", topH)
        .attr("fill", c2);

      bottom
        .attr("x", d => Math.floor(x(d.x)))
        .attr("width", Math.ceil(x(epsilon)))
        .attr("y", 0)
        .attr("height", botH)
        .attr("fill", c1);
    });
  }
};

//A dot for the mean, and error bars representing a 95% z-confidence interval of the mean.
var meanError = {};

meanError.make = function(){
  let div = d3.select("#vises").append("div");
  div.append("div").classed("title", true).html("Mean + Error Bars");
  let svg = div.append("svg").attr("id", "mean").classed("vis", true);

  svg.append("line")
    .classed("error", true)
    .attr("x1", x(0.5))
    .attr("x2", x(0.5))
    .attr("y1", y(0.5))
    .attr("y2", y(0.5))
    .attr("stroke", fillColor)
    .attr("stroke-width", 4);

  svg.append("circle")
    .classed("mean", true)
    .attr("cx", -10)
    .attr("cy", y(0.5))
    .attr("r", y(0.5) - y(0.6))
    .attr("fill", fillColor);
};

meanError.update = function(){
  if(distribution.length>0){
    let svg = d3.select("#mean");

    const mean = dl.mean(distribution);
    const error = dl.z.ci(distribution);

    svg.select("line.error")
      .transition()
      .attr("x1", x(error[0]))
      .attr("x2", x(error[1]));

    svg.select("circle.mean")
      .transition()
      .attr("cx", x(mean));
  }
};

//A violin chart, which is a symmetric density plot with a box plot inside of it.
var violin = {};

violin.make = function(){
  let div = d3.select("#vises").append("div");
  div.append("div").classed("title",true).html("Violin Chart");
  let svg = div.append("svg").attr("id", "violin").classed("vis", true);

  svg.append("path")
  .attr("fill", fillColor)
  .classed("top", true);

  svg.append("path")
  .attr("fill", fillColor)
  .classed("bottom", true);

  svg.append("rect")
  .classed("left", true)
  .attr("x", x(0.5))
  .attr("y", y(0.5) - 5)
  .attr("width", 0)
  .attr("height", "10px")
  .style("fill","white")
  .style("stroke", fillColor)
  .style("stroke-width", 4);

  svg.append("rect")
  .classed("right", true)
  .attr("x", x(0.5))
  .attr("y", y(0.5) - 5)
  .attr("width", 0)
  .attr("height", "10px")
  .style("fill", "white")
  .style("stroke", fillColor)
  .style("stroke-width", 4);
};

violin.update = function(){
  if(distribution.length > 0){
    const xs = dl.range(0, 1, epsilon);
    const data = xs.map(d => ({"x": d, "y": density(d)}));

    const tY = d3.scaleLinear().domain([0, dl.max(data,"y")]).range([height / 2, 4]);

    const tArea = d3.area()
      .x(d => x(d.x))
      .y1(d => tY(d.y))
      .y0(height/2);

    const bY = d3.scaleLinear().domain([0, dl.max(data,"y")]).range([height / 2, height - 4]);

    const bArea = d3.area()
      .x(d => x(d.x))
      .y1(d => bY(d.y))
      .y0(height / 2);

    let svg = d3.select("#violin");
    svg.select("path.top").datum(data)
      .transition()
      .attr("d",tArea);

    svg.select("path.bottom").datum(data)
      .transition()
      .attr("d",bArea);

    const qs = dl.quartile(distribution);

    svg.select("rect.left")
      .transition()
      .attr("width", x(qs[1] - qs[0]))
      .attr("x", x(qs[0]));

    svg.select("rect.right")
      .transition()
      .attr("x", x(qs[1]))
      .attr("width", x(qs[2] - qs[1]));
  }
};
