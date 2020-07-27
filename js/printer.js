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

class Printer extends Model {
    constructor() {
        super();
        this.materials = {};

        this.representation = new THREE.Object3D();

        this.materials.black = new THREE.MeshPhongMaterial({
            color  : 0x222222
        });
        
        this.materials.pink = new THREE.MeshPhongMaterial({
            color  : 0xFFAAAA
        });
        
        this.materials.beige = new THREE.MeshPhongMaterial({
            color  : 0xDABC9F
        });
        
        this.materials.gray = new THREE.MeshPhongMaterial({
            color  : 0x666666
        });

        this.materials.green = new THREE.MeshPhongMaterial({
            color  : 0xCCE425
        });

        this.materials.red = new THREE.MeshPhongMaterial({
            color  : 0xD8000E
        });

        this.materials.blue = new THREE.MeshPhongMaterial({
            //color  : 0x4F758B  // Pantone 5405C
            //color  : 0x003057  // Pantone 540C
            color  : 0x1B365D  // Pantone 534C
        });

        this.materials.chrome = new THREE.MeshPhongMaterial({
            color  : 0xCCCCCC,
            shininess: 120
        });

        this.materials.brass = new THREE.MeshPhongMaterial({
            color  : 0xA07000,
            shininess: 80
        });

        this.materials.orange = new THREE.MeshPhongMaterial({
            color  : 0xaa2200
        });

        this.materials.white = new THREE.MeshPhongMaterial({
            color  : 0xffffff
        });

        this.textureLoader = new THREE.TextureLoader();

        loadObjModel('models/printer-body.obj.gz', this.onLoadBody.bind(this));
        loadObjModel('models/printer-bed.obj.gz',  this.onLoadBed.bind(this));
        loadObjModel('models/printer-head.obj.gz', this.onLoadHead.bind(this));
        loadObjModel('models/printer-axis.obj.gz', this.onLoadAxis.bind(this));

        var bh = 0.095;  // Bed vertical position
        var wt = 0.00255; // Washer thickness above bed

        // When changing the printer model files, it may be necessary to adjust these
        // offsets until everything aligns properly.
        
        this.partOffsets = {
            bed:       new THREE.Vector3(   0.050 ,  bh       ,      0.120),
            head:      new THREE.Vector3(  -0.080 ,  bh-wt    ,     -0.0375),
            axis:      new THREE.Vector3(   0.050 ,  bh-wt+0.057 ,  -0.055),
            filament:  new THREE.Vector3(  -0.139,    -wt    ,     -0.141)
        }

        this.print_bed_depth = 0.280;
        this.printSpeed = 0.060;
    }

    onLoadBody(object) {
        this.forAllMeshes(
            child => {
                child.material = this.getMaterial(child.name);
                child.geometry.scale(0.001,0.001,0.001);
                child.geometry.rotateY(Math.PI/2);
            },
            object
        );
        this.align({x:0.5, y:0, z:0.5}, object);
        this.representation.add(object);
        this.body = object;
        if(this.body && this.axis && this.head && this.bed && this.filament) {
            this.onAllLoaded();
        }
    }

    onLoadBed(object) {
        object.position.add(this.partOffsets.bed);

        this.forAllMeshes(
            child => {
                child.material = this.getMaterial(child.name);
                child.geometry.scale(0.001,0.001,0.001);
                child.geometry.rotateX(-Math.PI/2);
            },
            object
        );
        this.align({x:0.5, y: 1, z:0.5}, object);

        this.bed = object;
        this.representation.add(object);
        if(this.deferredGcodePath) {
            this.setGcodePath(this.deferredGcodePath);
        }

        if(this.body && this.axis && this.head && this.bed && this.filament) {
            this.onAllLoaded();
        }
    }

    onLoadHead(object) {
        this.forAllMeshes(
            child => {
                child.material = this.getMaterial(child.name);
                child.geometry.scale(0.001,0.001,0.001);
            },
            object
        );
        this.align({x:0.5, y:0, z:0.5}, object);

        this.head = object;
        this.representation.add(object);

        if(this.body && this.axis && this.head && this.bed && this.filament) {
            this.onAllLoaded();
        }
    }

    onLoadAxis(object) {
        this.forAllMeshes(
            child => {
                child.material = this.getMaterial(child.name);
                child.geometry.scale(0.001,0.001,0.001);
            },
            object
        );
        this.align({x:0.5, y:0.5, z:0.5}, object);

        object.position.add(this.partOffsets.axis);

        this.axis = object;
        this.representation.add(object);

        if(this.body && this.axis && this.head && this.bed && this.filament) {
            this.onAllLoaded();
        }
    }

    onAllLoaded() {
        this.addCaseDecal();
        this.addDisplayImage();
        this.turnOnPrinter();
        this.setHeadOffset(0,0,this.print_bed_depth);
        if(this.onReady) {
            this.onReady();
        }
        //this.gear = this.fixElementOrigin("largeherringbone_step1_01");
    }

    turnOnPrinter() {
        var el = this.fixElementOrigin("power_switch_001");
        el.rotation.z = Math.PI;
    }

    addCaseDecal() {
        var el = this.findElement("electronics_chassis_hd_touchscreen_001");
        el.geometry.computeBoundingBox();

        var bbox = el.geometry.boundingBox;
        var center_x = (bbox.min.x + bbox.max.x)/2;
        var center_y = (bbox.min.y + bbox.max.y)/2;
        var center_z = (bbox.min.z + bbox.max.z)/2;
        var length_x = bbox.max.x - bbox.min.x;
        var length_y = bbox.max.y - bbox.min.y;
        var length_z = bbox.max.z - bbox.min.z;

        // Front decal
        var inset     = 0.001;
        var geometry  = new THREE.PlaneGeometry(length_x - inset*2, length_y - inset*2);
        var material  = new THREE.MeshPhongMaterial( {
            transparent: true,
            map:   this.textureLoader.load("textures/printer_front_panel.png"),
            shininess: 120,
        } );
        var frontFace = new THREE.Mesh( geometry, material );

        frontFace.position.x = center_x + inset - 0.0005;
        frontFace.position.y = center_y + inset;
        frontFace.position.z = bbox.max.z + 0.001;
        el.add( frontFace );
        
        // Side decal
        var geometry  = new THREE.PlaneGeometry(length_z - inset*2, length_y - inset*2);
        var material  = new THREE.MeshPhongMaterial( {
            transparent: true,
            map:   this.textureLoader.load("textures/printer_side_panel.png"),
            shininess: 120
        } );
        var sideFace = new THREE.Mesh( geometry, material );
        sideFace.rotateY(-Math.PI/2);

        sideFace.position.x = bbox.min.x - 0.003;
        sideFace.position.y = center_y + inset;
        sideFace.position.z = center_z + inset;
        el.add( sideFace );
    }

    addDisplayImage() {
        var el = this.findElement("LCD_bezel_V0.3_001");
        el.geometry.computeBoundingBox();

        var bbox = el.geometry.boundingBox;
        var center_x = (bbox.min.x + bbox.max.x)/2;
        var center_y = (bbox.min.y + bbox.max.y)/2;
        var center_z = (bbox.min.z + bbox.max.z)/2;
        var length_x = bbox.max.x - bbox.min.x;
        var length_y = bbox.max.y - bbox.min.y;
        var length_z = bbox.max.z - bbox.min.z;

        // LCD display
        var geometry  = new THREE.PlaneGeometry(0.066, 0.11);
        var material  = new THREE.MeshBasicMaterial( {
            map:   this.textureLoader.load("textures/touch_panel.jpg")
        } );
        var displayFace = new THREE.Mesh( geometry, material );

        displayFace.position.x = center_x;
        displayFace.position.y = center_y;
        displayFace.position.z = bbox.max.z - 0.005;

        el.add( displayFace );
    }

    setHeadOffset(x,y,z) {
        // Note: x,y,z are in THREE.js coordinate space, not in GCODE coordinate space.
        if(this.head && this.axis && this.bed) {
            this.head.position.set(x,y,0).add(this.partOffsets.head);
            this.axis.position.set(0,y,0).add(this.partOffsets.axis);
            this.bed.position.set( 0,0,-z).add(this.partOffsets.bed);
        }
    }

    animate(t, dt) {
        if(this.filament) {
            var changed = this.filament.animate(t, dt, this.printSpeed);
            if(changed) {
                var pos = this.filament.position;
                this.setHeadOffset(
                    pos.x,
                    pos.y,
                    pos.z
                );
            }
            /*if(this.filament.isExtruding) {
                // TODO: Implement rotation direction based on GCODE.
                this.gear.rotation.z += dt * this.printSpeed * 1.6;
            }*/
        }
    }

    getMaterial(componentName) {
        switch(componentName) {
            // Printer colors
            case "electronics_chassis_hd_touchscreen_001":
            case "electronics_chassis_cover_001":
            case "y_end_plate1_001":
            case "y_end_plate1_002":
            case "corner_bracket_revD_001":
            case "corner_bracket_revD_002":
            case "corner_bracket_revD_003":
            case "corner_bracket_revD_004":
            case "corner_bracket_revD_005":
            case "corner_bracket_revD_006":
            case "corner_bracket_revD_007":
            case "corner_bracket_revD_008":
            case "Z_top_plate_revc_001":
            case "Z_top_plate_revc_002":
                return this.materials.blue;
            case "z_upper_leftv3.4_001":
            case "z_upper_rightv3.4_001":
            case "z_lower_leftv2.4_001":
            case "z_lower_rightv2.4_001":
            case "LCD_bezel_V0.3_001":
            case "bed_mount_chassis_v3.5_001":
            case "bed_mount_chassis_v3.5_002":
            case "bed_mount_chassis_v3.5_003":
            case "bed_mount_chassis_v3.5_004":
            case "bed_mount_table_v1.1_001":
            case "bed_mount_table_v1.1_002":
            case "bed_mount_table_v1.1_003":
            case "bed_mount_table_v1.1_004":
            case "y_corner_left_v1.1_001":
            case "y_corner_left_v1.1_002":
            case "y_corner_right_v1.1_001":
            case "y_corner_right_v1.1_002":
            case "USB_bezel_v1_001":
                return this.materials.black;
            case "Z_lower_leftv2.4_001":
            case "Z_lower_rightv2.4_001":
            case "Y_motor_mount_001":
            case "Y_idler_housing_001":
                return this.materials.gray;
            case "power_switch_001":
              return this.materials.red;
            case "10mmx405_001":
            case "10mmx405_002":
            case "10mmx405_003":
            case "10mmx405_004":
                return this.materials.gray;
            case "10mmx500mm_rod_v0.1_revA_001":
            case "10mmx500mm_rod_v0.1_revA_002":
                return this.materials.chrome;
            case "t-slot_extrusion_530mm_001":
            case "t-slot_extrusion_530mm_002":
            case "t-slot_extrusion_530mm_003":
            case "t-slot_extrusion_530mm_004":
            case "t-slot_extrusion_500mm_001":
            case "t-slot_extrusion_500mm_002":
            case "t-slot_extrusion_500mm_003":
            case "t-slot_extrusion_500mm_004":
            case "5to1_stepper_motor_001":
            case "5to1_stepper_motor_002":
            case "5to1_stepper_motor_003":
                return this.materials.black;
            // X axis colors
            case "_2mmx540_rod_01":
            case "_2mmx540_rod_02":
                return this.materials.chrome;
            case "vr_x_idler_v3_8_01":
            case "x_motor_mount_01":
                return this.materials.gray;
            case "x_double_bearing_holder_01":
            case "x_carriage_v0_1_01":
            case "nema_17_motor_01":
                return this.materials.black;
            // Toolhead colors
            case "toolhead_mount_001":
                return this.materials.gray;
            case "x_carriage_cover_v1_01":
            case "x_double_bearing_holder_01":
            case "x_carriage_v0_1_01":
            case "blower_shroud_v1_001":
            case "hemara_001":
            case "50mm_blower_001":
                return this.materials.black;
            case "v6_nozzle_001":
                return this.materials.brass;
            case "v6_block_001":
            case "hermera_knob_001":
                return this.materials.chrome;
            // Bed colors
            case "auxilary_bed_mount_cover_01":
            case "bed_corner_v2_2_3_01":
            case "bed_corner_v2_2_3_02":
            case "bed_corner_v2_2_3_03":
            case "bed_corner_v2_2_3_04":
            case "wiper_mount_v2_1_02":
            case "y_cable_cover_v1_01":
                return this.materials.black;
            case "bed_leveling_washer_v2_0_PP_MP0082_revA_01":
            case "bed_leveling_washer_v2_0_PP_MP0082_revA_02":
            case "bed_leveling_washer_v2_0_PP_MP0082_revA_03":
            case "bed_leveling_washer_v2_0_PP_MP0082_revA_04":
            case "bed_standoff_01":
            case "bed_standoff_02":
            case "bed_standoff_03":
            case "bed_standoff_04":
                return this.materials.chrome;
            case "schnoz_wad_01":
                return this.materials.white;
            case "heatbed_01":
                return this.materials.orange;
            case "bed_mount_plate_revF_01":
                return this.materials.blue;
            case "schnoz_001":
                return this.materials.white;
            default:
                return this.materials.black;
        }
    }

    setGcodePath(path) {
        if(this.bed) {
            this.filament = new Filament(this.bed, path, this.print_bed_depth);
            this.filament.representation.position.add(this.partOffsets.filament);
            this.setFilamentMaterial({color: this.materials.beige.color});
        } else {
            this.deferredGcodePath = path;
        }
        if(this.body && this.axis && this.head && this.bed && this.filament) {
            this.onAllLoaded();
        }
    }

    setFilamentMaterial(attr) {
        this.filament.material = attr;

        if(!this.reel) {
            this.reel = new FilamentReel(attr);
            this.reel.representation.position.x = 0.390;
            this.reel.representation.position.y = 0.200;
            this.reel.representation.rotation.z = Math.PI/2;
            this.representation.add(this.reel.representation);
        } else {
            this.reel.material = attr;
        }
    }

    setPrintSpeed(speed) {
        this.printSpeed = speed;
    }

    start() {
        this.filament.start();
    }
}