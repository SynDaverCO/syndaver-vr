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

picture_width  = 100;
picture_height = 150;
frame_depth    = 15;
frame_border   = 20;

frame_width    = picture_width+frame_border*2;
frame_height   = picture_height+frame_border*2;

module frame() {
	difference() {
		cube([frame_width,frame_depth,frame_height],center=true);

		translate([0,-frame_depth/2,0])
			cube([picture_width,frame_depth,picture_height],center=true);
	}
}

module stand_profile() {
	a = sin(5);
	scale([frame_width/2,frame_width/2])
	polygon(points=[
		[0.0,1.0],
		[0.3,1.0],
		[1.0,0.4],
		[1.0,0.0+a*1.0],
		[0.6,0.0+a*0.6],
		[0.0,0.7]
	]);
}

module stand() {
	a = 0.1;
	rotate([90,0,90])
	linear_extrude(5)
	translate([0,-frame_width/2,0])
	scale([1,1,1])
	stand_profile();
}

frame();

translate([0,5,-(frame_height-frame_width)/2])
	rotate([0,15,0])
	stand();
