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

class Bench extends Model {
    constructor() {
        super();
        this.materials = {};

        this.representation = new THREE.Object3D();
        this.textureLoader = new THREE.TextureLoader();

        var metal = this.textureLoader.load("textures/brushed_metal.jpg");
        metal.wrapS = THREE.RepeatWrapping;
        metal.wrapT = THREE.RepeatWrapping;
        metal.repeat.set( 6, 6 );

		this.materials.metal = new THREE.MeshPhongMaterial({map: metal});

        loadObjModel('models/bench.obj.gz', this.onLoadBench.bind(this));
    }

    onLoadBench(object) {
        this.representation.add(object);
        this.forAllMeshes(
            child => {
                child.material = this.getMaterial(child.name);
                child.geometry.rotateX(-Math.PI/2);
                child.geometry.scale(0.001,0.001,0.001);
                this.addUV(child.geometry);
            }
        );
        this.align({y:1});
        this.bench = object;
    }

    addUV(geometry) {
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();
        var max = geometry.boundingBox.max,
            min = geometry.boundingBox.min;
        var positions = geometry.attributes.position.array;
        var normals   = geometry.attributes.normal.array;
        var nVertices = positions.length/3;

        var uvs    = new Float32Array(nVertices * 2);
        var colors = new Float32Array(nVertices * 3);
        for (var i = 0; i < nVertices ; i++) {
            var x = positions[i*3 + 0];
            var y = positions[i*3 + 1];
            var z = positions[i*3 + 2];
            var nx = normals[i*3 + 0];
            var ny = normals[i*3 + 1];
            var nz = normals[i*3 + 2];

            if(nx > 0.5 || nx < -0.5) {
                uvs[i*2 + 0] = (y - min.y)/(max.y - min.y);
                uvs[i*2 + 1] = (z - min.z)/(max.z - min.z);
            }
            if(ny > 0.5 || ny < -0.5) {
                uvs[i*2 + 0] = (x - min.x)/(max.x - min.x);
                uvs[i*2 + 1] = (z - min.z)/(max.z - min.z);
            }
            if(nz > 0.5 || nz < -0.5) {
                uvs[i*2 + 0] = (x - min.x)/(max.x - min.x);
                uvs[i*2 + 1] = (y - min.y)/(max.y - min.y);
            }
        }
        geometry.addAttribute( 'colors', new THREE.BufferAttribute( colors, 3 ) );
        geometry.addAttribute( 'uv',     new THREE.BufferAttribute( uvs, 2 ) );
    }

    getMaterial(componentName) {
        return this.materials.metal;
    }
}

class FilamentReel extends Model {
    constructor(attr) {
        super();
        this.materials = {};

        this.representation = new THREE.Object3D();
        this.textureLoader  = new THREE.TextureLoader();

        var filament = this.textureLoader.load("textures/filament.png");
        filament.wrapS = THREE.RepeatWrapping;
        filament.wrapT = THREE.RepeatWrapping;

        this.materials.reel = new THREE.MeshPhongMaterial();

        this.materials.filament = new THREE.MeshPhongMaterial({
            bumpMap:   filament,
            bumpScale: 0.00025
        });
        this.material = attr;

        loadObjModel('models/reel.obj.gz', this.onLoadReel.bind(this));
    }

    onLoadReel(object) {
        this.representation.add(object);
        this.forAllMeshes(
            child => {
                child.geometry.computeVertexNormals();
                child.geometry.scale(0.001,0.001,0.001);
                child.geometry.rotateX(-Math.PI/2);
                child.material = this.materials.reel;
            },
            object
        );
        this.align({x:0.5,y:0,z:0.5}, object);

        // Overlay the filament color as a band around the reel.
        var bbox = this.computeBoundingBox(object);
        var height = bbox.max.y - bbox.min.y;
        var geometry = new THREE.CylinderBufferGeometry( 0.070, 0.070, height-0.001, 32, 1, true );
        var filament = new THREE.Mesh( geometry, this.materials.filament );
        filament.position.y = height/2;
        this.representation.add( filament );

        this.reel = object;
    }


    set material(attr) {
        this.materials.filament.color = new THREE.Color(attr.color);
        if(attr.translucent) {
            this.materials.filament.opacity = 0.65;
            this.materials.filament.transparent = true;
        } else {
            this.materials.filament.opacity = 1.0;
            this.materials.filament.transparent = false;
        }
        // Translucent or black filaments use a white reel
        this.materials.reel.color = new THREE.Color((attr.translucent || attr.color == 0) ? 0xFFFFFF : 0x444444);
    }
}

class FilamentStack {
    constructor(interactiveObject, callback) {
        this.representation = new THREE.Object3D();
        this.stackHeight = 0;
        this.filaments = [];
        this.interactiveObject = interactiveObject;
        this.callback = callback;
    }

    addMaterial(attr) {
        var reel = new FilamentReel(attr);
        reel.representation.position.x = (Math.random() - 0.5) * 0.030;
        reel.representation.position.z = (Math.random() - 0.5) * 0.030;
        reel.representation.position.y = this.stackHeight;
        this.representation.add(reel.representation);
        this.filaments.push(reel);
        this.stackHeight += 0.060;

        var cursor = this.interactiveObject.addTarget(reel.representation, this.callback.bind(null,attr));
        cursor.representation.position.x = -0.080;
        cursor.representation.position.y =  0.027;
        return reel;
    }
}

class LavaLamp {
    constructor(interactionObject, color_1, color_2) {
        this.radius     = 0.025;
        this.height     = 0.150;
        this.baseHeight = 0.070;
        this.capHeight  = 0.070;

        // Range of motion of ball
        this.yMin = this.radius;
        this.yMax = this.height - this.radius;

        this.representation = new THREE.Object3D();

        // Materials
		var lampMaterial = new THREE.MeshPhongMaterial({
            color: new THREE.Color(color_1),
            side:  THREE.DoubleSide
        });
        var oilMaterial = new THREE.MeshPhongMaterial({
            color: new THREE.Color(color_2)
        });
        var glassMaterial = new THREE.MeshPhongMaterial( {
            color:       0xCCCCFF,
            opacity:     0.5,
            transparent: true
        });

        // Floating spheres
        var geometry = new THREE.SphereBufferGeometry(this.radius-0.001, 32, 32);
        this.sphere1  = new THREE.Mesh(geometry, oilMaterial);
        this.sphere2  = new THREE.Mesh(geometry, oilMaterial);
        this.sphere2.scale.set(0.3,0.3,0.3);

        // Glass cylinder
        var geometry  = new THREE.CylinderBufferGeometry(this.radius, this.radius*1.5, this.height, 20, 32);
        this.cylinder = new THREE.Mesh(geometry, glassMaterial);
        this.cylinder.position.y = this.height/2 + this.baseHeight;
        this.cylinder.add(this.sphere1);
        this.cylinder.add(this.sphere2);
        this.representation.add(this.cylinder);

        // Base
        var geometry  = new THREE.CylinderBufferGeometry(this.radius*1.5, this.radius, this.baseHeight, 20, 32, true);
        var base      = new THREE.Mesh(geometry, lampMaterial);
        base.position.y = this.baseHeight/2;
        this.representation.add(base);

        // Endcap
        var geometry  = new THREE.CylinderBufferGeometry(this.radius*.7, this.radius, this.capHeight, 20, 32, true);
        var cap       = new THREE.Mesh(geometry, lampMaterial);
        cap.position.y = this.capHeight/2 + this.baseHeight + this.height;
        this.representation.add(cap);

        var light = new THREE.SpotLight( 0xffffff, 2.0, 0, Math.PI/8);
        light.position.set(0,0,0);
        light.target = this.sphere1;
        this.representation.add(light);

        this.setValue(0);

        function mouseWithin(intersection) {
            this.yPos = Math.max(this.yMin, Math.min(this.yMax, intersection.uv.y * this.height));
            this.setValue((this.yPos - this.yMin)/(this.yMax - this.yMin));
            if(this.callback) {
                this.callback(this.value);
            }
        }
        function mouseLeft() {
            this.cylinder.userData.onMouseWithin = null;
            this.cylinder.userData.onMouseLeave  = null;
        }
        function startTracking() {
            this.cylinder.userData.onMouseWithin = mouseWithin.bind(this);
            this.cylinder.userData.onMouseLeave  = mouseLeft.bind(this);
        }

        // Hovering on the sphere enables the slider.
        interactives.addTarget(this.sphere1, startTracking.bind(this)).floatDistance = this.radius + 0.005;
        interactives.addInteraction(this.cylinder);
    }

    setValue(value) {
        this.value = value;
        this.sphere1.position.y = (  value) * (this.yMax - this.yMin) + this.yMin - this.height/2;
        this.sphere2.position.y = (1-value) * (this.yMax - this.yMin) + this.yMin - this.height/2;
    }

    get interactionSurface() {
        return this.cylinder;
    }

    set onChange(callback) {
        this.callback = callback;
    }
}

class Monitor extends Model {
    constructor() {
        super();
        this.materials = {};

        this.representation = new THREE.Object3D();

        this.materials.black = new THREE.MeshPhongMaterial({
            color  : 0x444444
        });

        loadObjModel('models/monitor.obj.gz', this.onLoaded.bind(this));
    }

    onLoaded(object) {
        this.representation.add(object);
        var lastMesh;
        this.forAllMeshes(
            child => {
                child.geometry.computeVertexNormals();
                child.geometry.scale(0.001,0.001,0.001);
                child.geometry.rotateX(-Math.PI/2);
                child.material = this.materials.black;
                lastMesh = child;
            },
            object
        );

        var loader   = new THREE.TextureLoader();
        var material = new THREE.MeshPhongMaterial({
            emissiveMap:   loader.load("textures/screen.jpg"),
            emissive:      0xFFFFFF,
            color:         0x000000
        });
        var geometry = new THREE.PlaneBufferGeometry(0.350, 0.275);
        var display  = new THREE.Mesh(geometry, material);
        this.representation.add(display);
        display.position.y = 0.220;

        this.align({y:0}, object);

        this.monitor = object;
    }
}

class Keyboard {
    constructor(interactiveObject, callback) {
        this.representation = new THREE.Object3D();
        var black = new THREE.MeshPhongMaterial({color: 0x444444});
        var red   = new THREE.MeshPhongMaterial({color: 0x96172E});
        var gray  = new THREE.MeshPhongMaterial({color: 0x666666});

        const inset  = 0.020;
        const width  = 0.380;
        const depth  = 0.150;
        const height = 0.020;
        var geometry = new THREE.BoxBufferGeometry(width, height, depth);
        var keyboard  = new THREE.Mesh(geometry, black);
        this.representation.add(keyboard);
        keyboard.position.y = 0.010;

        function makeKey(xMin, xMax, material) {
            var geometry = new THREE.BoxBufferGeometry(xMax-xMin, height + 0.004, depth-inset*2);
            var key = new THREE.Mesh(geometry, material);
            key.position.y = height/2 + 0.002;
            key.position.x = (xMax+xMin)/2 - width/2;
            return key;
        }
        // Keys
        var middle = 0.280;
        var k1 = makeKey(inset, middle-inset/2      , gray);
        var k2 = makeKey(middle+inset/2, width-inset, red);
        this.representation.add(k1);
        this.representation.add(k2);

        var cursor = interactiveObject.addTarget(k2, callback);
        cursor.representation.position.y = height - 0.004;
    }
}

class Computer {
    constructor() {
        this.representation = new THREE.Object3D();

        var loader   = new THREE.TextureLoader();
        var caseMaterial = new THREE.MeshPhongMaterial({color: 0x444444});
        var faceMaterial = new THREE.MeshPhongMaterial({
            map:              loader.load("textures/pc_face.png"),
            emissiveMap:      loader.load("textures/pc_face_emissive.png"),
            emissive:          0xFFFFFF,
            emissiveIntensity: 2.0
            //color:            0x444444,
        });
        var sideMaterial = new THREE.MeshPhongMaterial({
            emissiveMap:      loader.load("textures/pc_side_emissive.png"),
            emissive:         0xFFFFFF,
            color:            0x444444,
            emissiveIntensity: 2.0
        });

        const height = 0.57;
        const width  = 0.25;
        const depth  = 0.61;

        var geometry = new THREE.BoxBufferGeometry(width, height, depth);
        var computer  = new THREE.Mesh(geometry, [
            sideMaterial, // Right face
            sideMaterial, // Left face
            caseMaterial, // Top face
            caseMaterial,
            faceMaterial, // Front face
            caseMaterial
        ]);
        this.representation.add(computer);
        computer.position.y = height/2;
    }
}

class PictureFrame extends Model {
    constructor(color) {
        super();
        this.materials = {};

        this.representation = new THREE.Object3D();

        this.materials.black = new THREE.MeshPhongMaterial({
            color  : color
        });

        loadObjModel('models/frame.obj.gz', this.onLoaded.bind(this));
    }

    onLoaded(object) {
        this.representation.add(object);
        var lastMesh;
        this.forAllMeshes(
            child => {
                child.geometry.computeVertexNormals();
                child.geometry.scale(0.001,0.001,0.001);
                child.geometry.rotateX(-Math.PI/2);
                child.material = this.materials.black;
                lastMesh = child;
            },
            object
        );

        var loader   = new THREE.TextureLoader();
        var material = new THREE.MeshPhongMaterial({
            map:   loader.load("textures/photograph.png"),
        });
        var geometry = new THREE.PlaneBufferGeometry(0.100, 0.150);
        var frame  = new THREE.Mesh(geometry, material);
        this.representation.add(frame);
        frame.position.y = 0.095;
        frame.position.z = 0.001;

        this.align({y:0}, object);

        this.frame = object;
    }
}