/**
 *
 * @licstart
 *
 * Copyright (C) 2017  AlephObjects, Inc.
 *
 *
 * The JavaScript code in this page is free software: you can
 * redistribute it and/or modify it under the terms of the GNU Affero
 * General Public License (GNU AGPL) as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.  The code is distributed WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU AGPL for more details.
 *
 * As additional permission under GNU AGPL version 3 section 7, you
 * may distribute non-source (e.g., minimized or compacted) forms of
 * that code without the copy of the GNU AGPL normally required by
 * section 4, provided you include this license notice and a URL
 * through which recipients can access the Corresponding Source.
 *
 * @licend
 *
 */

class Model {
    constructor() {
    }

    forAllMeshes(func, object) {
        if(!object) object = this.representation;
        object.traverse( ( child ) => {
            if ( child instanceof THREE.Mesh ) {
                func(child);
            }
        });
    }

    computeBoundingBox(object) {
        if(!object) object = this.representation;
        var minX = Infinity;
        var minY = Infinity;
        var minZ = Infinity;
        var maxX = -Infinity;
        var maxY = -Infinity;
        var maxZ = -Infinity;
        object.traverse (function (mesh)
        {
            if (mesh instanceof THREE.Mesh)
            {
                mesh.geometry.computeBoundingBox ();
                var bBox = mesh.geometry.boundingBox;

                // compute overall bbox
                minX = Math.min (minX, bBox.min.x);
                minY = Math.min (minY, bBox.min.y);
                minZ = Math.min (minZ, bBox.min.z);
                maxX = Math.max (maxX, bBox.max.x);
                maxY = Math.max (maxY, bBox.max.y);
                maxZ = Math.max (maxZ, bBox.max.z);
            }
        });
        var bBox_min = new THREE.Vector3 (minX, minY, minZ);
        var bBox_max = new THREE.Vector3 (maxX, maxY, maxZ);
        return new THREE.Box3 (bBox_min, bBox_max);
    }

    align(axis, object=null) {
        if(!object) object = this.representation;
        var bbox = this.computeBoundingBox(object);
        var center_x = typeof axis.x !== 'undefined' ? bbox.min.x + (bbox.max.x - bbox.min.x)*axis.x : 0;
        var center_y = typeof axis.y !== 'undefined' ? bbox.min.y + (bbox.max.y - bbox.min.y)*axis.y : 0;
        var center_z = typeof axis.z !== 'undefined' ? bbox.min.z + (bbox.max.z - bbox.min.z)*axis.z : 0;
        this.forAllMeshes( mesh => {
            mesh.geometry.translate(-center_x, -center_y, -center_z);
        }, object);
    }

    findElement(name) {
        var res;
        this.representation.traverse( ( child ) => {
            if ( !res && child instanceof THREE.Mesh && name == child.name ) {
                res = child;
            }
        });
        return res;
    }

    fixElementOrigin(name) {
        // In the OBJ files, the position of elements are baked in
        // to the mesh vertex coordinates. This function centers
        // the mesh and offsets the elements position.
        var el = this.findElement(name);
        el.geometry.computeBoundingBox();
        var bbox = el.geometry.boundingBox;
        var center_x = (bbox.min.x + bbox.max.x)/2;
        var center_y = (bbox.min.y + bbox.max.y)/2;
        var center_z = (bbox.min.z + bbox.max.z)/2;
        el.geometry.translate(-center_x, -center_y, -center_z);
        el.position.x = center_x;
        el.position.y = center_y;
        el.position.z = center_z;
        return el;
    }
}