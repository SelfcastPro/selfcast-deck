import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8')
  .replace(/\n\s*<script src="\.\/app\.js\?v=1\.3\.0" defer><\/script>\s*/i, '\n');
const scriptContent = readFileSync(new URL('./app.js', import.meta.url), 'utf8');

function createDom(owner){
  const data = {
    title: 'Test Deck',
    owner,
    talents: [
      {
        name: 'Talent One',
        primary_image: '',
        profile_url: '',
        requested_media_url: ''
      }
    ]
  };
  const encoded = Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: `https://example.com/?data=${encoded}`
  });
  const { window } = dom;
  window.requestAnimationFrame = (fn)=>{ fn(); return 0; };
  window.print = () => {};
  window.document.fonts = { ready: Promise.resolve() };
  window.eval(scriptContent);
  return dom;
}

describe('contact details rendering', () => {
  it('renders all contact fields with separators', () => {
    const dom = createDom({
      name: 'Alice Example',
      email: 'alice@example.com',
      phone: '+45 1234'
    });
    const contactLine = dom.window.document.querySelector('#contactLine');
    expect(contactLine.textContent).toBe('Alice Example · alice@example.com · +45 1234');
    const emailLink = contactLine.querySelector('a');
    expect(emailLink).not.toBeNull();
    expect(emailLink.getAttribute('href')).toBe('mailto:alice@example.com');

    const printContact = dom.window.document.querySelector('.ph-contact');
    expect(printContact).not.toBeNull();
    expect(printContact.innerHTML).toBe('<span>Alice Example</span> · <a href="mailto:alice@example.com">alice@example.com</a> · <span>+45 1234</span>');
    dom.window.close();
  });

  it('omits separators when only name is present', () => {
    const dom = createDom({ name: 'Solo Name' });
    const contactLine = dom.window.document.querySelector('#contactLine');
    expect(contactLine.textContent).toBe('Solo Name');
    expect(contactLine.querySelector('a')).toBeNull();

    const printContact = dom.window.document.querySelector('.ph-contact');
    expect(printContact.innerHTML).toBe('<span>Solo Name</span>');
    dom.window.close();
  });

  it('renders email link without empty href when only email exists', () => {
    const dom = createDom({ email: 'only@example.com' });
    const contactLine = dom.window.document.querySelector('#contactLine');
    expect(contactLine.textContent).toBe('only@example.com');
    const emailLink = contactLine.querySelector('a');
    expect(emailLink).not.toBeNull();
    expect(emailLink.getAttribute('href')).toBe('mailto:only@example.com');

    const printContact = dom.window.document.querySelector('.ph-contact');
    expect(printContact.innerHTML).toBe('<a href="mailto:only@example.com">only@example.com</a>');
    dom.window.close();
  });

  it('hides contact line when no fields exist', () => {
    const dom = createDom({});
    const contactLine = dom.window.document.querySelector('#contactLine');
    expect(contactLine.textContent).toBe('');
    expect(contactLine.style.display).toBe('none');
    expect(dom.window.document.querySelector('.ph-contact')).toBeNull();
    dom.window.close();
  });
});
