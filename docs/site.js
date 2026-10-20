// Copy buttons copy the code block next to them.
for (const button of document.querySelectorAll('.copy')) {
	button.addEventListener('click', async () => {
		const code = button.parentElement.querySelector('pre code').textContent;
		try {
			await navigator.clipboard.writeText(code);
			button.textContent = 'Copied';
		} catch {
			button.textContent = 'Select and copy';
		}
		setTimeout(() => { button.textContent = 'Copy'; }, 1600);
	});
}

// Menu button shows the sidebar on small screens.
const menu = document.querySelector('.menu');
const sidebar = document.getElementById('sidebar');
menu.addEventListener('click', () => {
	const open = sidebar.classList.toggle('is-open');
	menu.setAttribute('aria-expanded', String(open));
	menu.textContent = open ? 'Close' : 'Menu';
});

// "On this page" marks the section being read.
const links = [...document.querySelectorAll('.toc a')];
const observer = new IntersectionObserver((entries) => {
	for (const entry of entries) {
		if (!entry.isIntersecting) continue;
		for (const a of links) a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
	}
}, { rootMargin: '-80px 0px -70% 0px' });
for (const h of document.querySelectorAll('.doc h2[id]')) observer.observe(h);
