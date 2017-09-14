"use strict";

module.exports = function(str, sep, w1, w2) {
	let s = 0, m = 0, r = [];
	for(let i=0;i<str.length;++i) {
		switch(s) {
		case 0:
			if(str[i] == w1) {
				m = i + 1;
				s = 2;
			}else if(str[i] == sep) {
			}else{
				m = i;
				s = 1;
				--i;
			}
			break;
		case 1:
			if(str[i] == sep || i == str.length - 1) {
				r.push(str.substr(m, Math.max(i - m, 1)));
				s = 0;
			}
			break;
		case 2:
			if(str[i] == w2 || i == str.length - 1) {
				r.push(str.substr(m, Math.max(i - m, 1)));
				s = 0;
			}
			break;
		}
	}
	return r;
};