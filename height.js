/**
 * height.js ... functions to generate/mutate height maps
 *
 * 	a height map is a list of (nomally 0-1) heights,
 *	with a 1x1 correspondance to chosen horizontal mesh
 */
"use strict";

/**
 * zero ... return a heightmap of all zeroes
 *
 * @param	mesh
 * @return	heightmap of all zeroes
 */
function zero(mesh) {
    var z = [];
    for (var i = 0; i < mesh.vxs.length; i++) {
        z[i] = 0;
    }
    z.mesh = mesh;
    return z;
}

/**
 * slope ... create a sloping height map
 * 
 * @param	mesh
 * @param	gradient vector
 */
function slope(mesh, direction) {
    return mesh.map(function (x) {
        return x[0] * direction[0] + x[1] * direction[1];
    });
}

/**
 * cone ... create centered conical height map
 *	height = slope x radius out from center
 *
 * @param	mesh
 * @param	slope (dz/dxy)
 * @return	new height map
 */
function cone(mesh, slope) {
    return mesh.map(function (x) {
        return Math.pow(x[0] * x[0] + x[1] * x[1], 0.5) * slope;
    });
}

/**
 * heightmap.map(f) applies f to every point in heightmap
 */
function map(h, f) {
    var newh = h.map(f);
    newh.mesh = h.mesh;
    return newh;
}

/**
 * normalize ... normalize a height map to (0-1)
 *
 * @param	height map
 * @return	new height map
 */
function normalize(h) {
    var lo = d3.min(h);
    var hi = d3.max(h);
    return map(h, function (x) {return (x - lo) / (hi - lo)});
}

/**
 * peaky ... exaggerate the vertical relief
 *
 *	replace each height with its square root
 *	leaves mountains high, but flattens low-lands
 *
 * @param	height map
 * @return	new (normalized) height map
 */
function peaky(h) {
    return map(normalize(h), Math.sqrt);
}

/**
 * add ... sum multiple height maps
 *
 * @param	first map
 * @param	... n'th map
 * @return	new height map (sum of args)
 */
function add() {
    var n = arguments[0].length;
    var newvals = zero(arguments[0].mesh);
    // for each point in mesh
    for (var i = 0; i < n; i++) {
	// for each map
        for (var j = 0; j < arguments.length; j++) {
            newvals[i] += arguments[j][i];
        }
    }
    return newvals;
}

/**
 * mountains ... create a mountainous height map
 *	height = (e^-dist/radius)^2
 *
 * @param	mesh
 * @param	number of mountains
 * @param	desired radius
 * @return	new height map
 */
function mountains(mesh, n, r) {
    r = r || 0.05;

    // choose a center location for each desired mountain
    var mounts = [];
    for (var i = 0; i < n; i++) {
        mounts.push([mesh.extent.width * (Math.random() - 0.5), mesh.extent.height * (Math.random() - 0.5)]);
    }

    var newvals = zero(mesh);
    // for each point in mesh
    for (var i = 0; i < mesh.vxs.length; i++) {
        var p = mesh.vxs[i];
	// for each mountain
        for (var j = 0; j < n; j++) {
            var m = mounts[j];
	    // compute the height that mounain adds to this point
            newvals[i] += Math.pow(Math.exp(-((p[0] - m[0]) * (p[0] - m[0]) + (p[1] - m[1]) * (p[1] - m[1])) / (2 * r * r)), 2);
        }
    }
    return newvals;
}

/**
 * relax ... average with neighbors to smoothe terrain
 * 
 * @param	height map
 * @return	new height map
 */
function relax(h) {
    var newh = zero(h.mesh);
    for (var i = 0; i < h.length; i++) {
        var nbs = neighbours(h.mesh, i);
	// points on border are set to zero
        if (nbs.length < 3) {
            newh[i] = 0;
            continue;
        }
	// new height = average height of neighbors
        newh[i] = d3.mean(nbs.map(function (j) {return h[j]}));
    }
    return newh;
}

/**
 * quantile (return the n'th highest value)
 *
 * @param	height map
 * @param	target fraction (0-1)
 * @return	height of chosen value
 */
function quantile(h, q) {
    var sortedh = [];
    for (var i = 0; i < h.length; i++) {
        sortedh[i] = h[i];
    }
    sortedh.sort(d3.ascending);
    return d3.quantile(sortedh, q);
}

/**
 * setSeaLevel ... readjust heights relative to sea-level
 *
 * @param	height map
 * @param	sea level height (0-1)
 * @return	new height map
 */
function setSeaLevel(h, q) {
    var newh = zero(h.mesh);
    // find the sea level altitude
    var delta = quantile(h, q);

    // subtract that altitude from every value
    for (var i = 0; i < h.length; i++) {
        newh[i] = h[i] - delta;
    }
    return newh;
}
