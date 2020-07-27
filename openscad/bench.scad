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

depth  = 750;
cutout = 750;
height = 940;
overhang = 50;
wall     = 100;

surface_depth = 45;
w=depth*2+cutout;
d=depth  +cutout;

module cut_out() {
	translate([0,-d/2+cutout/2-wall, 0])
		cube ([cutout, cutout+10+wall, 1000], center=true);
}

module bench_top() {
	difference() {
		cube ([w,d,surface_depth], center=true);
		cut_out();
	}
}

module base_cut_out() {
	translate([0,-d/2+cutout/2-wall, 0])
		cube ([cutout+wall*2, cutout+10+wall, height+2], center=true);
}

module bench_base() {
	translate([0,0, -height/2])
	difference() {
		cube ([w-overhang,d-overhang,height], center=true);
		cube ([w-overhang-wall*2,d-overhang-wall,height+1], center=true);
		base_cut_out();
	}
}

translate([0,cutout/2,-surface_depth/2]) {
	bench_top();
	bench_base();
}