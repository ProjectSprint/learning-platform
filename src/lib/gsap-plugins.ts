import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let scrollTriggerRegistered = false;

export const ensureScrollTrigger = () => {
	if (scrollTriggerRegistered) {
		return;
	}

	gsap.registerPlugin(ScrollTrigger);
	scrollTriggerRegistered = true;
};

let svgPluginsRegistered = false;

export const ensureSvgPlugins = () => {
	if (svgPluginsRegistered) {
		return;
	}

	gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin);
	svgPluginsRegistered = true;
};

export { DrawSVGPlugin, MorphSVGPlugin, ScrollTrigger };
