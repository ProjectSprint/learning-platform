import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let scrollTriggerRegistered = false;

export const ensureScrollTrigger = () => {
	if (scrollTriggerRegistered) {
		return;
	}

	gsap.registerPlugin(ScrollTrigger);
	scrollTriggerRegistered = true;
};

export { ScrollTrigger };
