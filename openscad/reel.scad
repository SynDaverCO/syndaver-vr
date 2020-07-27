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

outer_dia      = 200;
inner_dia      =  75;
height         =  55;
wall_thickness =  3;

module face() {
	difference() {
		cylinder(h=wall_thickness, r=outer_dia/2, center=true);
		cylinder(h=wall_thickness+5, r=inner_dia/2, center=true);
	}
}

module core() {
	difference() {
		cylinder(h=height+1,r=inner_dia/2+wall_thickness, center=true);
		cylinder(h=height+5,r=inner_dia/2               , center=true);
	}
}

core();

translate([0,0,-height/2])
face();
translate([0,0,height/2])
	face();