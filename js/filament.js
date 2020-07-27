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

class Filament {
    constructor(parent, gcode_path, print_bed_depth) {
        this.nPoints         = 0;
        this.print_bed_depth = print_bed_depth;

        // The filament path
        this.geometry = new THREE.BufferGeometry();

        this.loadGCodePath(gcode_path);
        this.geometry.addAttribute( 'position',  new THREE.BufferAttribute(this.lineSegmentEnds,      3));
        this.geometry.addAttribute( 'color',     new THREE.BufferAttribute(this.lineSegmentColors,    3));
        this.geometry.addAttribute( 'normal',    new THREE.BufferAttribute(this.lineSegmentNormal,    3));
        this.geometry.setDrawRange( 0, 0 );

        this.filamentPath = new THREE.LineSegments( this.geometry, this.getShaderMaterial() );

        // Final segment is used for plotting from the endpoint of the
        // last complete segment to the vary last interpolated point
        this.finalSegmentGeometry = new THREE.Geometry();
        this.finalSegmentGeometry.vertices.push(
            new THREE.Vector3( 0, 0, 0 ),
            new THREE.Vector3( 0, 0, 0 )
        );
        var material = new THREE.LineBasicMaterial({color: 0x00FF00});
        this.finalSegment = new THREE.Line( this.finalSegmentGeometry,  material );

        this.representation = new THREE.Object3D();
        parent.add(this.representation);
        this.representation.add(this.filamentPath);
        this.representation.add(this.finalSegment);

        // Temporary vectors used for interpolation
        this.lastPosition = new THREE.Vector3();
        this.nextPosition = new THREE.Vector3();
        this.interpolatedPosition = new THREE.Vector3();

        this.distancePrinted = 0;
    }

    loadGCodePath(gcode_path) {
        var extrudedSegments = 0;
        var toolpathSegments = 0;

        var last_e = 0;
        gcode_path.forEachSegment(
            (gcode_x, gcode_y, gcode_z, gcode_e) =>
            {
                if(gcode_e > last_e) {
                    extrudedSegments++;
                }
                toolpathSegments++;
                last_e = gcode_e;
            }
        );

        this.toolPath             = new Float32Array(toolpathSegments*3); // 3 floats per point
        this.cumulativeDistance   = new Float32Array(toolpathSegments);   // 1 float  per point
        this.segmentsToShow       = new Int32Array(toolpathSegments);     // 1 index  per point

        this.lineSegmentEnds      = new Float32Array(extrudedSegments*6); // 6 floats per segment
        this.lineSegmentColors    = new Float32Array(extrudedSegments*6); // 6 floats per segment
        this.lineSegmentNormal    = new Float32Array(extrudedSegments*6); // 6 floats per segment

        var distanceTravelled = 0;
        var oldPos         = new THREE.Vector3();
        var curPos         = new THREE.Vector3();
        var i = 0, j = 0;
        var last_x, last_y, last_z, last_e;
        gcode_path.forEachSegment(
            (gcode_x, gcode_y, gcode_z, gcode_e) =>
            {
                // IMPORTANT: Convert from GCODE coordinate system to THREE.js coordinate
                // system. We chose to implement all coordinates in this file in THREE.js
                // space, so this is the only place conversion should occur.
                var this_x = gcode_x/1000;
                var this_y = gcode_z/1000;
                var this_z = this.print_bed_depth - gcode_y/1000;
                var this_e = gcode_e/1000;
                
                // Initial condition
                if(i == 0) {
                    last_x = this_x;
                    last_y = this_y;
                    last_z = this_z;
                    last_e = this_e;
                    oldPos.set(this_x, this_y, this_z);
                }
                
                // Add position to the toolpath
                this.toolPath[i*3 + 0] = this_x;
                this.toolPath[i*3 + 1] = this_y;
                this.toolPath[i*3 + 2] = this_z;
                this.segmentsToShow[i] = j;

                // Track cumulative distance travelled
                curPos.set(this_x, this_y, this_z);
                distanceTravelled += curPos.distanceTo(oldPos);
                this.cumulativeDistance[i] = distanceTravelled;
                oldPos.copy(curPos);

                if(this_e > last_e) {
                    // Negative segmentsToShow to mark extrusion
                    this.segmentsToShow[i] *= -1;

                    // If extruding, add a segment to line segments
                    this.lineSegmentEnds[j*6 + 0] = last_x;
                    this.lineSegmentEnds[j*6 + 1] = last_y;
                    this.lineSegmentEnds[j*6 + 2] = last_z;
                    this.lineSegmentEnds[j*6 + 3] = this_x;
                    this.lineSegmentEnds[j*6 + 4] = this_y;
                    this.lineSegmentEnds[j*6 + 5] = this_z;

                    // Record the surface normal in XZ plane
                    this.lineSegmentNormal[j*6 + 0] = last_z - this_z;
                    this.lineSegmentNormal[j*6 + 1] = 0;
                    this.lineSegmentNormal[j*6 + 2] = last_x - this_x;
                    this.lineSegmentNormal[j*6 + 3] = last_z - this_z;
                    this.lineSegmentNormal[j*6 + 4] = 0;
                    this.lineSegmentNormal[j*6 + 5] = last_x - this_x;
                    j++;
                }
                i++;
                last_x = this_x;
                last_y = this_y;
                last_z = this_z;
                last_e = this_e;
            }
        );
        this.maxPoints = i;
    }

    start() {
        this.nPoints         = 0;
        this.distancePrinted = 0;
        this.animating       = true;
        this.material        = this.currentMaterial;
    }

    animate(t, dt, printSpeed) {
        this.distancePrinted += dt * printSpeed;

        if(this.nPoints >= (this.maxPoints - 2) || !this.animating) {
            return false;
        }

        // Advance nPoints to the last complete segment in the toolpath
        while(
            this.cumulativeDistance[this.nPoints+1] < this.distancePrinted &&
            this.nPoints < (this.maxPoints - 2)
        ) {
            this.nPoints++;
        }

        // Interpolate within the last incomplete segment
        this.lastPosition.set(
            this.toolPath[ this.nPoints*3 + 0 ],
            this.toolPath[ this.nPoints*3 + 1 ],
            this.toolPath[ this.nPoints*3 + 2 ]
        );
        this.nextPosition.set(
            this.toolPath[ this.nPoints*3 + 3 ],
            this.toolPath[ this.nPoints*3 + 4 ],
            this.toolPath[ this.nPoints*3 + 5 ]
        );
        var dist  = this.cumulativeDistance[this.nPoints + 1] - this.cumulativeDistance[this.nPoints];
        if(dist > 0) {
            var alpha = Math.min(1, (this.distancePrinted - this.cumulativeDistance[this.nPoints])/dist);
            this.interpolatedPosition.lerpVectors(this.lastPosition, this.nextPosition, alpha);
        } else {
            this.interpolatedPosition.copy(this.lastPosition);
        }

        // Show only completed segments
        this.isExtruding    = this.segmentsToShow[this.nPoints] < 0;
        var segmentsToShow  = Math.abs(this.segmentsToShow[this.nPoints]);
        this.geometry.setDrawRange(0, segmentsToShow*2+2);

        if(this.isExtruding) {
            this.finalSegmentGeometry.vertices[0].copy(this.lastPosition);
            this.finalSegmentGeometry.vertices[1].copy(this.interpolatedPosition);
            this.finalSegmentGeometry.verticesNeedUpdate = true;
        }
        return true;
    }

    get position() {
        return this.interpolatedPosition;
    }

    set material(attr) {
        var color = new THREE.Color(attr.color);
        // For translucent filaments, set the sign of the red component to
        // negative. The shader will render those portions as translucent.
        var color_r = color.r * (attr.translucent ? -1 : 1);
        for(var i = Math.abs(this.segmentsToShow[this.nPoints]) * 6; i < this.lineSegmentEnds.length; i += 6) {
            this.lineSegmentColors[i + 0] = color_r;
            this.lineSegmentColors[i + 1] = color.g;
            this.lineSegmentColors[i + 2] = color.b;
            this.lineSegmentColors[i + 3] = color_r;
            this.lineSegmentColors[i + 4] = color.g;
            this.lineSegmentColors[i + 5] = color.b;
        }
        this.geometry.attributes.color.needsUpdate = true;
        this.finalSegment.material.color = color;
        if(attr.translucent) {
            this.filamentPath.material.transparent = true;
            this.finalSegment.material.transparent = true;
            this.finalSegment.material.opacity     = 0.1;
        } else {
            // NOTE: Once a transparent filament is used, we must
            // keep transparency on unless we are starting from
            // scratch.
            if(this.nPoints == 0) {
                this.filamentPath.material.transparent = false;
            }
            this.finalSegment.material.transparent = false;
            this.finalSegment.material.opacity     = 1.0;
        }
        this.currentMaterial = attr;
    }

    getShaderMaterial() {
        return new THREE.ShaderMaterial( {
            vertexShader:   Filament.vertexShader,
            fragmentShader: Filament.fragmentShader,
            uniforms: {
                lightDirection:   {value: new THREE.Vector3(1,1,-1).normalize()},
                ambient:          {value: 0.4},
                diffuse:          {value: 0.7},
                opacity:          {value: 1.0}
            },
            vertexColors: THREE.VertexColors,
            transparent: false
        });
    }
}

Filament.vertexShader = `
    uniform   vec3    lightDirection;
    uniform   float   ambient;
    uniform   float   diffuse;
    varying   vec2    vUv;
    varying   vec3    vColor;
    varying   float   vOpacity;

    void main() {
       vOpacity = (color.r < 0.) ? 0.03 : 1.0; // Translucency encoded in sign of color.r
       float       iDiff = diffuse * max(dot(normalize(normal), lightDirection),0.);
       vUv         = uv;
       vColor      = clamp(abs(color) * (iDiff + ambient), 0., 1.);
       gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
`;

Filament.fragmentShader = `
    varying   vec3    vColor;
    varying   float   vOpacity;

    void main()  {
       gl_FragColor = vec4(vColor,vOpacity);
    }
`;