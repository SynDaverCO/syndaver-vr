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

var camera, scene, renderer, vrDisplay, effect, printer, interactives;
var clock     = new THREE.Clock();

function setupVR(sceneCallback) {
    if(!navigator.getVRDisplays) {
        console.log("WebVR is not supported");
        return;
    }

    try {
        // Get the VRDisplay and save it for later.
        vrDisplay = null;
        navigator.getVRDisplays().then(
            function(displays) {
                for(var i = 0; i < displays.length; i++) {
                    if(displays[i].capabilities.hasOrientation) {
                        console.log("Using VR display", i+1, "of", displays.length);
                        vrDisplay = displays[0];
                        sceneCallback();
                        return;
                    }
                }
                console.log("WebVR is supported, but no VR displays found");
            }
        );
    } catch(e) {
        console.log("Query of VRDisplays failed");
    }
}

function init() {
    setupVR(setupScene);

    window.addEventListener( 'resize', onWindowResize, false );
}

function setupFloorPlane(scene) {
    // Floor plane
    var geometry = new THREE.PlaneBufferGeometry(2.0, 2.0);
    var material = new THREE.MeshPhongMaterial( {
        color: 0x0000ff,
        side:  THREE.DoubleSide
    } );
    var floor = new THREE.Mesh( geometry, material );
    floor.rotation.x = Math.PI/2;
    floor.position.x = 0;
    floor.position.y = -0.02;
    floor.position.z = 0;
    scene.add(floor);
}

// Add a small sphere to a lightsource to help position it
function addLightIndicator(light, color) {
    var geometry = new THREE.SphereGeometry( 0.01, 32, 32 );
    var material = new THREE.MeshBasicMaterial( {color: color} );
    var sphere = new THREE.Mesh( geometry, material );
    light.add( sphere );
}

function setupScene() {
    var useAntialising = (window.location.hash == "#aa");
    console.log("Use antialiasing:", useAntialising);

    var canvas = document.getElementById('webgl');
    renderer  = new THREE.WebGLRenderer({canvas: canvas, antialias: useAntialising});
    renderer.setPixelRatio(Math.floor(window.devicePixelRatio));

    effect   = new THREE.VREffect(renderer);
    effect.setSize(window.innerWidth, window.innerHeight);
    //effect.setVRDisplay(vrDisplay);

    renderer.setClearColor( 0x67C8FE );

    camera    = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.75, 10 );
    scene     = new THREE.Scene();
    scene.add(camera);

    // Light1 shines from behind the printer and gives
    // a nice sheen on the bed surface and table when
    // viewed from the front.
    var light1 = new THREE.DirectionalLight( 0xffffff, 0.55);
    light1.position.set( 0.090, 0.180, -0.550 );
    scene.add(light1);
        
    // This light is carried by the person, to illuminate whatever
    // the user is looking at.
    var light2 = new THREE.PointLight( 0xffffff, 1.90, 1.70 );
    light2.position.set( -0.25, 0.25, 0 );
    camera.add(light2);
    
    // Uncomment to show spheres to help position the lights
    //addLightIndicator(light1, 0xFF0000);
    //addLightIndicator(light2, 0x00FF00);
    //addLightIndicator(scene, 0x000000);
    
    /*skydome           = new Skydome(scene, renderer);
    skydome.image     = 'textures/sky-day.jpg';
    skydome.symmetric = false;
    
    setupFloorPlane(scene);*/

    var benchHeight = 0.940;
    bench = new Bench();
    bench.representation.position.y = benchHeight;
    scene.add(bench.representation);

    interactives = new GazeInteraction(camera, canvas);
    scene.add(interactives.representation);
    interactives.setClickSound('sounds/click.ogg')

    var progressField = document.getElementById("downloadProgress");
    var progressTimer = setInterval(() => {
        progressField.innerText = downloadProgress.totalProgress + "%";
    }, 250);

    printer = new Printer();
    printer.representation.position.z = -0.750;
    printer.representation.position.y = benchHeight;
    scene.add(printer.representation);
    printer.onReady = function() {
        clearInterval(progressTimer);
        document.getElementById("loading").style.display = "none";
    }
    camera.lookAt(printer.representation.position);
    clearFileCache();

    filaments = new FilamentStack(interactives, (color) => printer.setFilamentMaterial(color));
    filaments.representation.position.x =  0.600;
    filaments.representation.position.y = benchHeight;
    filaments.representation.position.z = -0.300;
    scene.add(filaments.representation);

    filaments.addMaterial({color: 0xFF9600});  // Orange
    filaments.addMaterial({color: 0xDABC9F});  // Beige
    filaments.addMaterial({color: 0xFFAAAA});  // Pink

    filaments = new FilamentStack(interactives, (color) => printer.setFilamentMaterial(color));
    filaments.representation.position.x = 0.650;
    filaments.representation.position.y = benchHeight;
    filaments.representation.position.z = -0.050;
    scene.add(filaments.representation);

    filaments.addMaterial({color: 0xEFCF57}); // Yellow
    filaments.addMaterial({color: 0x664699}); // Purple
    filaments.addMaterial({color: 0xFFFFFF}); // White

    filaments = new FilamentStack(interactives, (color) => printer.setFilamentMaterial(color));
    filaments.representation.position.x = 0.600;
    filaments.representation.position.y = benchHeight;
    filaments.representation.position.z = 0.200;
    scene.add(filaments.representation);

    filaments.addMaterial({color: 0xE5D496, translucent: true});  // Translucent Yellow
    filaments.addMaterial({color: 0x96172E}); // SynDaver Purple
    filaments.addMaterial({color: 0xFFFFFF, translucent: true});  // Clear
    clearFileCache();

    lamp = new LavaLamp(interactives, 0x1B365D, 0x96172E);
    lamp.representation.position.z = -0.500;
    lamp.representation.position.y = benchHeight;
    lamp.representation.position.x = -0.560;
    scene.add(lamp.representation);
    lamp.onChange = function(value) {
        printer.setPrintSpeed((Math.pow(value, 5)*120)+0.060);
    }

    var monitor = new Monitor();
    monitor.representation.position.x = -0.700;
    monitor.representation.position.y = benchHeight;
    monitor.representation.rotation.y = 100 /180*Math.PI;
    scene.add(monitor.representation);
    clearFileCache();

    var computer = new Computer();
    computer.representation.position.x = -0.750;
    computer.representation.position.z =  0.150;
    computer.representation.position.y = 0;
    computer.representation.rotation.y = 90 /180*Math.PI;
    scene.add(computer.representation);

    var keyboard = new Keyboard(interactives, () => printer.start());
    keyboard.representation.position.x = -0.500;
    keyboard.representation.position.y = benchHeight + 0.010;
    keyboard.representation.rotation.x = 10.0 /180*Math.PI;
    keyboard.representation.rotation.y = Math.PI/2;
    keyboard.representation.rotation.order = 'YXZ';
    scene.add(keyboard.representation);

    var frame = new PictureFrame(0x1B365D);
    frame.representation.position.x = -0.700;
    frame.representation.position.z = -0.375;
    frame.representation.position.y = benchHeight;
    frame.representation.rotation.x = -10.0 /180*Math.PI;
    frame.representation.rotation.y = 70.0  /180*Math.PI;
    frame.representation.rotation.order = 'YXZ';
    scene.add(frame.representation);
    clearFileCache();

    var gcode = new GCodePath();
    loadUrl("models/brain.gcode.gz", data => {
        gcode.parse(data);
        printer.setGcodePath(gcode);
    });

    function vrPresentationChange() {
        document.getElementById("buttons").style.display = vrDisplay.isPresenting ? "none" : "block";
    }
    window.addEventListener("vrdisplaypresentchange", vrPresentationChange);

    // Viewpoint selection

    var vp = new PrinterViewpoints(printer);

    function animate() {
        vp.update();

        var dt = clock.getDelta();
        var  t = clock.getElapsedTime();
        printer.animate(t, dt);
        interactives.animate(t, dt);
        render();

        vrDisplay.requestAnimationFrame(animate);
    }

    onWindowResize();
    animate();

    function startVr() {
        if(vrDisplay && vrDisplay.capabilities.canPresent && effect.requestPresent) {
            // Change to standing position, for mobile VR.
            vp.eyeHeight = 1.2;
            //enterFullscreen(canvas);
            effect.requestPresent();
        } else {
              alert("VR not supported on this device. Please view this on a smartphone or VR headset.");
        }
    }
    var btn = document.getElementById('enter_vr');
    btn.addEventListener("mousedown", startVr);

    var btn = document.getElementById('fullscreen');
    btn.addEventListener("mousedown", enterFullscreen.bind(null, canvas));

    // Movement keys

    const step = 0.01;
    window.addEventListener("keydown", (event) => {
        vp.updateVectors();
        var k = event.which || event.keyCode;
        var c = String.fromCharCode(k);
        switch(String.fromCharCode(k)) {
            case "W": vp.scaledTranslation(vp.forward,  step); break;
            case "A": vp.scaledTranslation(vp.right,   -step); break;
            case "S": vp.scaledTranslation(vp.forward, -step); break;
            case "D": vp.scaledTranslation(vp.right,    step); break;
            case " ": vp.next(); break;
            default:
                switch(k) {
                    case 33 /* Page Up */:   vp.scaledTranslation(vp.up,  step); break;
                    case 34 /* Page Down */: vp.scaledTranslation(vp.up, -step); break;
                }
            break;
        }
        console.log("key", k, "char", c, "camera.position", camera.position);
    });

    window.addEventListener("wheel", (event) => {
       var dfov = event.deltaY > 0 ? -1 : 1;
       var fov = Math.max(Math.min(camera.fov + dfov, 50), 10);
       vp.setParams({fov: fov});
    });
}

class PrinterViewpoints extends GazeViewpoint {
    constructor(printer) {
        super(camera, vrDisplay);
        this.current = 0;
        this.viewPoints = [
            this.defaultViewpoint,
            this.aboveViewpoint,
            this.bedViewpoint.bind(this,1,1),
            this.bedViewpoint.bind(this,1,-1),
            this.toolheadViewpoint,
            this.sidePanelViewpoint
        ];
        this.printer = printer;
        this.defaultViewpoint();
    }

    next() {
        this.current = ++this.current % this.viewPoints.length;
        this.viewPoints[this.current].call(this);
    }

    defaultViewpoint() {
        scene.add(camera);
        super.setOrigin({x: 0.000, y: 0.000, z: 0.000}, true);
        super.setLookRelative({x: 0.000, y: 0.000, z: -1.000});
        super.setParams({near: 0.200, far: 4.00, fov: 50});
    }

    aboveViewpoint() {
        scene.add(camera);
        super.setOrigin({x: 0.036, y: 1.598, z:  -0.558}, false);
        super.setLookAt(this.printer.representation.position);
        super.setParams({near: 0.100, far: 4.000, fov: 50});
    }

    bedViewpoint(signx, signz) {
        scene.remove(camera);
        this.printer.bed.add(camera);
        super.setOrigin({x: 0.200*signx, y: 0.050, z: 0.200*signz}, false);
        super.setLookRelative({x: -100*signx, y: -0.050, z: -100*signz});
        super.setParams({near: 0.010, far: 4.000, fov: 50});
    }
    
    toolheadViewpoint() { 
        scene.remove(camera);
        this.printer.head.add(camera);
        super.setOrigin({x: -0.007, y: 0.025, z: 0.140}, false);
        super.setLookRelative({x: 0, y: -0.050, z: -100});
        super.setParams({near: 0.010, far: 4.000, fov: 50});
    }
    
    sidePanelViewpoint() { 
        scene.add(camera);
        super.setOrigin({x: -0.93, y: 1.16, z: -0.53}, false);
        super.setLookRelative({x: 1.000, y: 0.000, z: -0.600});
        super.setParams({near: 0.200, far: 4.00, fov: 50});
    }
}

function endVr() {
    if(effect.endPresent) {
        effect.endPresent();
    }
}

function render() {
    if(effect) {
        effect.render( scene, camera );
    }
}

function onWindowResize(event) {
    if(!this.resizeTimeout) {
        this.resizeTimeout = setTimeout(() => {
            if(camera && effect) {
                console.log('Resizing to %s x %s.', window.innerWidth, window.innerHeight);
                effect.setSize(window.innerWidth, window.innerHeight);
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
            }
            this.resizeTimeout = null;
        }, 250);
    }
}

function enterFullscreen (el) {
  if (el.requestFullscreen) {
    el.requestFullscreen();
  } else if (el.mozRequestFullScreen) {
    el.mozRequestFullScreen();
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen();
  } else if (el.msRequestFullscreen) {
    el.msRequestFullscreen();
  }
}

function onLoad() {
    init();
}