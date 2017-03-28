/**
 * mesh ... functions to generate the basic map
 *
 *	a mesh is a triangular tessalation of the map.
 *	a mesh includes:
 *		pts	... the original well spaced points
 *		vor	... Voronoi tesselation of those points
 *		vxs	... <x,y> coordinate of each Voronoi vertex
 *		adj	... list of vertex indices of neighors of each vertex
 *		tris	... list of <x,y> coordinates neighbors of each vertex
 *
 *		edges	... list of [index, index, <x,y>, <x,y>] tupples
 *   var tris = [];	// HELP ... how is this different from vxs?
 *
 *	O'Leary observed that a map created on a square grid never
 *	loses its regularity, so he wanted to build the map on an
 *	irregular grid.  But he found randomly chosen grids to be
 *	too irregular.  Mesh generation implements his compromise.
 *
 *	1. He starts by generating N completely randomly chosen points.
 *	   But these turn out to be a little to clumpy, so he smoothes
 *	   them out (improves them) by finding the Voronoi polygons
 *	   around those points and using their vertices.
 *
 *	2. He uses those (improved) points as the centers for a
 *	   second Voronoi tesselation.  The edges of those polygons
 *	   are then converted into a triangular grid
 */
"use strict";

/**
 * generatePoints: generate N random <x,y> points
 *	-0.5 <= x,y < 0.5
 *
 * @param	number of desired points
 * @param	extent (range limits)
 * @return	a list of n tupples
 */
function generatePoints(n, extent) {
    extent = extent || defaultExtent;
    var pts = [];
    for (var i = 0; i < n; i++) {
        pts.push([(Math.random() - 0.5) * extent.width, (Math.random() - 0.5) * extent.height]);
    }
    return pts;
}

/**
 * centroid - centroid of 
 * @param	set of <x,y> points
 * @return	<x,y> centroid coordinates
 */
function centroid(pts) {
    var x = 0;
    var y = 0;
    for (var i = 0; i < pts.length; i++) {
        x += pts[i][0];
        y += pts[i][1];
    }
    return [x/pts.length, y/pts.length];
}

/**
 * improvePoints: smooth a set of random points
 *
 * @param 	set of <x,y> points
 * @param	number of smoothing iterations
 * @param	extent (range limits)
 * @return	list of <x,y> coordinates
 *
 * each iteration smooths out the distribution of the points
 *	for each point in the set
 *	    generate surrounding Voronoi polygon
 *	    return the set of all their vertices
 */
function improvePoints(pts, n, extent) {
    n = n || 1;
    extent = extent || defaultExtent;
    for (var i = 0; i < n; i++) {
        pts = voronoi(pts, extent)
            .polygons(pts)
            .map(centroid);
    }
    return pts;
}

/**
 * generateGoodPoints: generate attractive random grid
 *
 * @param	number of points
 * @param	extent (range limits)
 * @return	list of <x,y> coordinates
 *
 * 1. generate a set of random points in the map
 * 2. run one improvement iteration on them
 */
function generateGoodPoints(n, extent) {
    extent = extent || defaultExtent;
    var pts = generatePoints(n, extent);
    pts = pts.sort(function (a, b) {
        return a[0] - b[0];
    });
    return improvePoints(pts, 1, extent);
}

// identify the Voronoi sets associated with a set of points
/**
 * voronoi: compute the Voronoi tesselation for a set or points
 *
 * @param	list of <x,y> coordinates
 * @param	extent (range limits)
 * @param	list of Voronoi regions
 */
function voronoi(pts, extent) {
    extent = extent || defaultExtent;
    var w = extent.width/2;
    var h = extent.height/2;
    return d3.voronoi().extent([[-w, -h], [w, h]])(pts);
}

/**
 * makeMesh - turn a set of well distributed points into a mesh
 *
 * @param	list of <x,y> coordinates
 * @param	extent (size range)
 */
function makeMesh(pts, extent) {
    extent = extent || defaultExtent;

    // compute the Voronoi polygons
    var vor = voronoi(pts, extent);
    var vxs = [];	// vertex locations
    var vxids = {};	// vertex ID #s
    var adj = [];	// adjacent vertices	
    var edges = [];	// list of vertex IDs and positions
    var tris = [];	// HELP ... how is this different from vxs?

    // for each edge of each Voronoi polygon
    for (var i = 0; i < vor.edges.length; i++) {
	// get the two end points of this edge
        var e = vor.edges[i];
        if (e == undefined) continue;

	// lookup (or assign) their vertex IDs
        var e0 = vxids[e[0]];
        if (e0 == undefined) {
            e0 = vxs.length;	
            vxids[e[0]] = e0;
            vxs.push(e[0]);
        }
        var e1 = vxids[e[1]];
        if (e1 == undefined) {
            e1 = vxs.length;
            vxids[e[1]] = e1;
            vxs.push(e[1]);
        }

	// note that each end-point is adjacent to the other
        adj[e0] = adj[e0] || [];
        adj[e0].push(e1);
        adj[e1] = adj[e1] || [];
        adj[e1].push(e0);

	// add indices and coordinates to known edges
        edges.push([e0, e1, e.left, e.right]);

	// note all edges entering the left end point
        tris[e0] = tris[e0] || [];
        if (!tris[e0].includes(e.left)) tris[e0].push(e.left);
        if (e.right && !tris[e0].includes(e.right)) tris[e0].push(e.right);

	// note all edges entering the right end point
        tris[e1] = tris[e1] || [];
        if (!tris[e1].includes(e.left)) tris[e1].push(e.left);
        if (e.right && !tris[e1].includes(e.right)) tris[e1].push(e.right);
    }

    // the new mesh contains all of these things
    var mesh = {
        pts: pts,	// a set of nicely spaced random points
        vor: vor,	// Voronoi tesselation of those points
        vxs: vxs,	// locations of each vertex
        adj: adj,	// indices of neighbors
        tris: tris,	// coordinates of neighbors
        edges: edges,	// the set of all edges
        extent: extent	// the scale 
    }

    // HELP
    mesh.map = function (f) {
        var mapped = vxs.map(f);
        mapped.mesh = mesh;
        return mapped;
    }
    return mesh;
}


/**
 * generateGoodMesh - top level mesh generation
 *
 * @param	number of desired points
 * @param	extent (size limits)
 * @return	mesh
 */
function generateGoodMesh(n, extent) {
    extent = extent || defaultExtent;
    var pts = generateGoodPoints(n, extent);
    return makeMesh(pts, extent);
}

/**
 * isedge - is a point on the map edge
 *
 * @param	mesh
 * @param	index of point of interest
 * @return	true ... point is on the edge
 *
 * In the final (triangular) grid points on the edge have 
 * only two neighbors, while internal points have 3 or more.
 */
function isedge(mesh, i) {
    return (mesh.adj[i].length < 3);
}

// near edge means in the outer 5% of the map
/**
 * isnearedge - is a point near the map edge
 *
 * @param	mesh
 * @param	index of point of interest
 * @return	true ... point is within 5% of edge
 */
function isnearedge(mesh, i) {
    var x = mesh.vxs[i][0];
    var y = mesh.vxs[i][1];
    var w = mesh.extent.width;
    var h = mesh.extent.height;
    return x < -0.45 * w || x > 0.45 * w || y < -0.45 * h || y > 0.45 * h;
}

/**
 * neighbors - neighbors of a vertex
 *
 * @param	mesh
 * @param	index of point of interest
 * @return	list of indices (of neighboring points)
 */
function neighbours(mesh, i) {
    var onbs = mesh.adj[i];
    var nbs = [];
    for (var i = 0; i < onbs.length; i++) {
        nbs.push(onbs[i]);
    }
    return nbs;
}

/**
 * distance - distance between two points
 *
 * @param	mesh
 * @param	index of first point
 * @param	index of second point
 * @return	(positive) distance between them
 */
function distance(mesh, i, j) {
    var p = mesh.vxs[i];
    var q = mesh.vxs[j];
    return Math.sqrt((p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]));
}
