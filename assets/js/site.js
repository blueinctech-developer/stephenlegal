/* StephenLegal Editorial — progressive enhancements only. Every feature works without this file. */
(function () {
	'use strict';

	// Menu disclosure.
	var toggle = document.querySelector('.menu-toggle');
	var menu = document.getElementById('site-menu');
	if (toggle && menu) {
		var setOpen = function (open) {
			toggle.setAttribute('aria-expanded', String(open));
			menu.hidden = !open;
			document.documentElement.classList.toggle('menu-open', open);
			if (open) {
				var field = menu.querySelector('input[type="search"]');
				if (field) field.focus();
			}
		};
		toggle.addEventListener('click', function () {
			setOpen(toggle.getAttribute('aria-expanded') !== 'true');
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
				setOpen(false);
				toggle.focus();
			}
		});
	}

	// Copy-link share button (shown only where the Clipboard API exists).
	var copy = document.querySelector('.share__copy');
	if (copy && navigator.clipboard) {
		copy.hidden = false;
		var status = document.querySelector('.share__status');
		copy.addEventListener('click', function () {
			navigator.clipboard.writeText(copy.getAttribute('data-copy')).then(function () {
				if (status) status.textContent = 'Link copied';
				setTimeout(function () { if (status) status.textContent = ''; }, 2500);
			});
		});
	}

	// Collapse the table of contents on narrow screens so the article starts sooner.
	var toc = document.querySelector('.toc details');
	if (toc && window.matchMedia('(max-width: 1179px)').matches) {
		toc.open = false;
	}
})();
