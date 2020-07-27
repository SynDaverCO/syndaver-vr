/**
 *
 * @licstart
 *
 * Copyright (C) 2017  AlephObjects, Inc.
 *
 *
 * The JavaScript code in this page is free software: you can
 * redistribute it and/or modify it under the terms of the GNU
 * General Public License (GNU GPL) as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.  The code is distributed WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.
 *
 * As additional permission under GNU GPL version 3 section 7, you
 * may distribute non-source (e.g., minimized or compacted) forms of
 * that code without the copy of the GNU GPL normally required by
 * section 4, provided you include this license notice and a URL
 * through which recipients can access the Corresponding Source.
 *
 * @licend
 *
 */

display_width  = 380;
display_height = 305;
display_depth  = 20;
display_bezel  = 30;

mount_dia      = 75;

stand_height   = 200;
stand_width    = 50;
stand_depth    = 40;

base_thickness = 20;
base_depth     = 150;
base_width     = 200;
base_chamfer   = 10;

module display() {
    display_recess = 2;
    translate([0,display_recess/2+display_depth/2,0])
    difference() {
        hull() {
            cube([display_width,display_depth,display_height],center=true);
            translate([0,display_depth,0])
                cube([display_width*0.8,display_depth*2,display_height*0.8],center=true);
        }
        translate([0,-display_depth/2,0])
            cube([display_width-display_bezel,display_recess,display_height-display_bezel],center=true);
    }
}

module stand() {
    difference() {
        translate([0,display_depth+stand_depth*1.5,0]) {

            // Hinge mount
            translate([0,-mount_dia/2+stand_depth/2,0])
            rotate([0,90,0])
                cylinder(r=mount_dia/2,h=display_width/4,center=true);

            // Vertical support
            translate([0,0,-stand_height/2])
                scale([stand_width, stand_depth, stand_height])
                    cylinder(h=1, r=0.5, center=true, $fn=20);
        }
        translate([0,-500,0])
            cube([1000,1000,1000],center=true);
    }
}

module base() {
	translate([0,base_depth*0.4,-stand_height-base_thickness/2]) {
        cube([base_width, base_depth, base_thickness-base_chamfer], center=true);
        cube([base_width-base_chamfer, base_depth-base_chamfer, base_thickness], center=true);
    }
}

base();
stand();
display();