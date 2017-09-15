'use strict';

var obj = {};

var rot = '0',
	top = 0,
	mid = 0,
	bot = 1;

obj[rot] = {};

console.log('Memory Usage: ')
console.log(process.memoryUsage());

while(top < 255 || mid < 255 || bot < 255) {
	
	var sTop = '' + top,
		sMid = '' + mid,
		sBot = '' + bot;
	
	if(!obj[rot][sTop]) {
		obj[rot][sTop] = {};
	}
	if(!obj[rot][sTop][sMid]) {
		obj[rot][sTop][sMid] = {};
	}
	obj[rot][sTop][sMid][sBot] = 'level 1';
	
	bot++;
	if(bot > 255) {
		bot = 1;
		mid++;
	}
	if(mid > 255) {
		mid = 1;
		top++;
		
		console.log('Top Increment to %d', top)
		console.log('Memory Usage: ')
		console.log(process.memoryUsage());
	}
}
console.log('Memory Usage: ')
console.log(process.memoryUsage());
console.log(Object.keys(obj).length);
