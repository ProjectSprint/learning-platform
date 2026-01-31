// Tooltip definitions for inventory items in the webserver-ssl question

import type { TooltipInfo } from "@/components/game/puzzle/inventory";

export const INVENTORY_TOOLTIPS: Record<string, TooltipInfo> = {
	browser: {
		content:
			"A web browser is software that allows users to access websites. You'll use it to test your webserver configuration.",
		seeMoreHref:
			"https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanics/What_is_a_web_browser",
	},
	"webserver-80": {
		content:
			"An HTTP webserver serves unencrypted content on port 80. Anyone on the network can see what's being sent!",
		seeMoreHref:
			"https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanics/What_is_a_web_server",
	},
	"webserver-443": {
		content:
			"An HTTPS webserver serves encrypted content on port 443. It requires an SSL certificate and private key.",
		seeMoreHref:
			"https://developer.mozilla.org/en-US/docs/Web/Security/Secure_contexts",
	},
	domain: {
		content:
			"A domain name (like example.com) is the address where your website can be found on the internet.",
		seeMoreHref:
			"https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanics/What_is_a_domain_name",
	},
	"index-html": {
		content:
			"The index.html file is the default page your webserver serves when someone visits your website.",
		seeMoreHref:
			"https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML/Document_and_website_structure",
	},
	"private-key": {
		content:
			"🔑 The private key is SECRET. It stays on your server and is used to decrypt incoming HTTPS traffic. NEVER share it with anyone!",
		seeMoreHref: "https://www.digicert.com/faq/what-is-a-private-key.htm",
	},
	certificate: {
		content:
			"📜 The domain certificate contains your public key and proves your server's identity to browsers. It's PUBLIC - you share it with visitors.",
		seeMoreHref: "https://www.digicert.com/faq/what-is-an-ssl-certificate.htm",
	},
	"redirect-to-https": {
		content:
			"↪️ A redirect sends HTTP visitors to HTTPS automatically. This ensures everyone uses the secure connection, even if they type http://",
		seeMoreHref:
			"https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections",
	},
};
