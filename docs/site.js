// Accordion: one slice open at a time, on hover, focus or click.
const slices = document.querySelectorAll('.slice');
for (const slice of slices) {
	const open = () => {
		for (const s of slices) s.classList.toggle('is-open', s === slice);
	};
	slice.addEventListener('mouseenter', open);
	slice.addEventListener('focus', open);
	slice.addEventListener('click', open);
}

// Copy buttons copy the code block in the same card.
for (const button of document.querySelectorAll('.copy')) {
	button.addEventListener('click', async () => {
		const code = button.closest('.card').querySelector('pre code').textContent;
		try {
			await navigator.clipboard.writeText(code);
			button.textContent = 'Copied';
		} catch {
			button.textContent = 'Select and copy';
		}
		setTimeout(() => { button.textContent = 'Copy'; }, 1600);
	});
}

// Nav: the lime pill follows the section on screen.
const navLinks = [...document.querySelectorAll('.nav-group a')];
const targets = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
const observer = new IntersectionObserver((entries) => {
	for (const entry of entries) {
		if (!entry.isIntersecting) continue;
		const id = '#' + entry.target.id;
		for (const a of navLinks) a.classList.toggle('is-active', a.getAttribute('href') === id);
	}
}, { rootMargin: '-45% 0px -50% 0px' });
for (const t of targets) observer.observe(t);

// Motion. Skipped when GSAP didn't load or the reader asked for less motion.
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (window.gsap && window.ScrollTrigger && !calm) {
	gsap.registerPlugin(ScrollTrigger);

	// Hero stage grows from 0.88 to full size as it scrolls in, then dims as it leaves.
	const stage = document.querySelector('[data-scale]');
	gsap.fromTo(stage, { scale: 0.88 }, {
		scale: 1,
		ease: 'none',
		scrollTrigger: { trigger: stage, start: 'top 95%', end: 'top 35%', scrub: true },
	});
	gsap.to(stage, {
		opacity: 0.35,
		ease: 'none',
		scrollTrigger: { trigger: stage, start: 'bottom 45%', end: 'bottom top', scrub: true },
	});

	// Statement: each word scrubs from faint to full as it crosses the screen.
	const reveal = document.querySelector('[data-reveal]');
	const words = reveal.textContent.trim().split(/\s+/);
	reveal.textContent = '';
	for (const [i, w] of words.entries()) {
		const span = document.createElement('span');
		span.className = 'word';
		span.textContent = w;
		reveal.append(span, i < words.length - 1 ? ' ' : '');
	}
	gsap.to(reveal.querySelectorAll('.word'), {
		opacity: 1,
		stagger: 0.1,
		ease: 'none',
		scrollTrigger: { trigger: reveal, start: 'top 80%', end: 'bottom 45%', scrub: true },
	});

	// Write section: the heading stays pinned while the cards scroll past, on wide screens only.
	gsap.matchMedia().add('(min-width: 1101px)', () => {
		ScrollTrigger.create({
			trigger: '.split',
			start: 'top 120px',
			end: () => `bottom ${120 + document.querySelector('.split-pin').offsetHeight}px`,
			pin: '.split-pin',
			pinSpacing: false,
		});
	});
}
