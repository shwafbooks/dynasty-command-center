import assert from'node:assert/strict';import{buildMetricConfidence,stabilityToConfidence}from'../lib/metric-confidence.js';
const high=buildMetricConfidence({coverage:.96,sourceAgreement:.9,formulaStability:.9,dataCompleteness:1});assert.equal(high.status,'ready');assert.equal(high.label,'very-high');assert.equal(high.metricAdjusted,false);
const partial=buildMetricConfidence({coverage:.8,sourceAgreement:.6});assert.equal(partial.confidence,.7);assert.equal(partial.label,'moderate');assert.equal(partial.dimensions.formulaStability,null);assert.equal(partial.metricAdjusted,false);
const none=buildMetricConfidence({});assert.equal(none.status,'insufficient-data');assert.equal(none.confidence,null);assert.equal(stabilityToConfidence({orderSpread:0,teamCount:10}),1);assert.equal(stabilityToConfidence({orderSpread:9,teamCount:10}),0);
const originalMetric=.83;buildMetricConfidence({coverage:.4,sourceAgreement:.4});assert.equal(originalMetric,.83);
console.log(JSON.stringify({high,partial,stability:{stable:stabilityToConfidence({orderSpread:0,teamCount:10}),volatile:stabilityToConfidence({orderSpread:9,teamCount:10})},underlyingMetricUnchanged:originalMetric},null,2));
