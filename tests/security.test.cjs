const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const functionSource = (name) => {
  const match = html.match(new RegExp(`function ${name}\\([^\\n]*\\n[\\s\\S]*?\\n  \\}`));
  assert.ok(match, `Missing function ${name}`);
  return match[0];
};

function renderCard(value, field) {
  const nodes = {};
  const context = {
    trainingItems: [{ [field]: value, [field === 'prompt' ? 'isHtmlPrompt' : 'isHtmlTarget']: true }],
    currentIndex: 0,
    document: {
      getElementById(id) {
        return nodes[id] ??= { classList: { add() {} } };
      },
    },
  };
  vm.runInNewContext(`${functionSource('safeUnderline')}\n${functionSource('showCard')}\nshowCard()`, context);
  return nodes[field === 'prompt' ? 'promptText' : 'targetText'].innerHTML;
}

for (const field of ['prompt', 'target']) {
  test(`Mix ${field} escapes active HTML and preserves underline text`, () => {
    const value = '<svg onload="window.marker=1"></svg><img src=x onerror="window.marker=1"><u>Wort & Satz</u>';
    const result = renderCard(value, field);
    assert.ok(!result.includes('<svg'));
    assert.ok(!result.includes('<img'));
    assert.ok(result.includes('&lt;svg'));
    assert.ok(result.includes('<u>Wort &amp; Satz</u>'));
  });
  test(`Mix ${field} rejects attributes and encoded tags`, () => {
    assert.equal(renderCard('<u onclick="run()">Text</u>', field), '&lt;u onclick="run()"&gt;Text</u>');
    assert.equal(renderCard('&lt;img src=x onerror=run()&gt;', field), '&amp;lt;img src=x onerror=run()&amp;gt;');
    assert.equal(renderCard(null, field), '');
  });
}

test('speech text uses the same safe HTML conversion', () => {
  let written;
  let spoken;
  const context = {
    trainingItems: [{ target: '<img src=x onerror=run()><u>Text</u>', tLang: 'en-US' }],
    currentIndex: 0,
    document: {
      createElement() {
        return {
          set innerHTML(value) { written = value; },
          get textContent() { return 'spoken text'; },
        };
      },
    },
    window: { speechSynthesis: { cancel() {}, speak(value) { spoken = value; } } },
    SpeechSynthesisUtterance: function (text) { this.text = text; },
  };
  vm.runInNewContext(`${functionSource('safeUnderline')}\n${functionSource('playAudio')}\nplayAudio('target')`, context);
  assert.ok(!written.includes('<img'));
  assert.ok(written.includes('<u>Text</u>'));
  assert.equal(spoken.text, 'spoken text');
});
