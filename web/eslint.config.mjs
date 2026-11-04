import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
	...nextVitals,
	...nextTs,
	// Third-party libraries served as they are (jQuery, jQuery Marquee, Swiper).
	{ ignores: [".next/**", "node_modules/**", "next-env.d.ts", "public/legacy/vendor/**"] },
];

export default config;
