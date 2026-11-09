/*
  terminal.js turns the terminal in the hero into a small working shell.

  How it fits together:
    1. It reads your content from the page itself (about, skills, experience, education,
       achievements, contact) and from projects.js, so there is only one place to edit.
    2. It builds a pretend filesystem (home folder, /var, /etc, /usr) so cd, ls and cat work.
    3. It hides a capture-the-flag challenge in that filesystem. The flag is NOT written in this
       file. Only an encrypted blob and a SHA-256 hash of the flag are, so reading the source
       does not hand it over, and the hash is what "submit" checks a guess against.

  Safe by design: every piece of output goes through textContent or createTextNode, never
  innerHTML, so project text can never turn into live HTML.
*/
(function () {
  'use strict';

  var termBody = document.querySelector('.term-body');
  if (!termBody) return;

  // -------------------------------------------------------------------
  // 1. Challenge data (the flag is not here, only a vault and a hash)
  // -------------------------------------------------------------------
  var VAULT = 'MjQyMDIwMDgwNjUxMWEwZDA2NTY1MTNhMDQ1ODE3NWIxMjMxMDM0NTA4NWIzYTAwMWEyYzQ1MDAxMw==';
  var FLAG_HASH = '0bbdeac5faa9a24243e4a5a13a079c69ce240167bfaec8abc9f11929468f065d';

  // -------------------------------------------------------------------
  // 2. SHA-256 (small, no libraries, works on plain http and file:// too)
  // -------------------------------------------------------------------
  var SHA_K = [], SHA_H = [];
  (function () {
    var primes = [], n = 2, i, j, isPrime;
    while (primes.length < 64) {
      isPrime = true;
      for (j = 0; j < primes.length; j++) {
        if (n % primes[j] === 0) { isPrime = false; break; }
      }
      if (isPrime) primes.push(n);
      n++;
    }
    for (i = 0; i < 64; i++) SHA_K[i] = Math.floor((Math.pow(primes[i], 1 / 3) % 1) * 4294967296);
    for (i = 0; i < 8; i++) SHA_H[i] = Math.floor((Math.pow(primes[i], 1 / 2) % 1) * 4294967296);
  })();

  function ror(x, n) { return (x >>> n) | (x << (32 - n)); }

  function sha256(str) {
    var m = new TextEncoder().encode(str);
    var len = m.length;
    var blocks = ((len + 8) >> 6) + 1;
    var words = new Uint32Array(blocks * 16);
    var i, b;
    for (i = 0; i < len; i++) words[i >> 2] |= m[i] << (24 - (i % 4) * 8);
    words[len >> 2] |= 0x80 << (24 - (len % 4) * 8);
    words[blocks * 16 - 1] = len * 8;

    var h = SHA_H.slice();
    var w = new Uint32Array(64);
    for (b = 0; b < blocks; b++) {
      for (i = 0; i < 16; i++) w[i] = words[b * 16 + i];
      for (i = 16; i < 64; i++) {
        var s0 = ror(w[i - 15], 7) ^ ror(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        var s1 = ror(w[i - 2], 17) ^ ror(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      var a = h[0], bb = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (i = 0; i < 64; i++) {
        var S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (hh + S1 + ch + SHA_K[i] + w[i]) | 0;
        var S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22);
        var maj = (a & bb) ^ (a & c) ^ (bb & c);
        var t2 = (S0 + maj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + bb) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    return h.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }

  // -------------------------------------------------------------------
  // 3. Small helpers
  // -------------------------------------------------------------------
  function pad(s, n) { s = String(s); return s + new Array(Math.max(0, n - s.length) + 1).join(' '); }

  function safeUrl(u) {
    u = String(u || '').trim();
    return /^(https?:\/\/|mailto:|[A-Za-z0-9_\-.\/]+$)/.test(u) ? u : '';
  }

  function nodeText(sel, root) {
    var n = (root || document).querySelector(sel);
    return n ? n.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  // A "line" is a string, or an array of pieces. A piece is a string or { t: text, c: css class, href: link }.
  function normalizeLine(l) {
    if (typeof l === 'string') return [l];
    if (Array.isArray(l)) return l;
    return [l];
  }

  function plainLine(l) {
    return normalizeLine(l).map(function (s) { return typeof s === 'string' ? s : s.t; }).join('');
  }

  function toLines(res) {
    if (res === undefined || res === null) return [];
    if (typeof res === 'string') return res.split('\n');
    return res;
  }

  function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

  function openUrl(url) {
    try { window.open(url, '_blank', 'noopener'); } catch (e) { /* popup blocked, the link is printed anyway */ }
  }

  function githubUrl() {
    var a = document.querySelector('a[href^="https://github.com/"]');
    return a ? a.getAttribute('href') : 'https://github.com/Elishane786';
  }

  var DISCORD_HANDLE = 'eli0100';
  var LINKEDIN_URL = 'https://www.linkedin.com/in/muhammed-ali-razvi';

  function emailAddress() { return nodeText('#email'); }

  // -------------------------------------------------------------------
  // 4. Content, read from the page so it never goes out of date
  // -------------------------------------------------------------------
  function aboutLines() {
    var t = nodeText('#about .lead');
    return t ? [t] : ['nothing found'];
  }

  function skillsLines() {
    var out = [];
    document.querySelectorAll('#skills .skillgroup').forEach(function (g) {
      var chips = [].map.call(g.querySelectorAll('.chip'), function (c) { return c.textContent.trim(); });
      out.push([{ t: pad(nodeText('h3', g), 20), c: 't-dim' }, chips.join(', ')]);
    });
    return out.length ? out : ['nothing found'];
  }

  function rowLines(sectionId) {
    var out = [];
    document.querySelectorAll('#' + sectionId + ' .row').forEach(function (r, i) {
      if (i) out.push('');
      out.push([{ t: nodeText('h3', r), c: 't-strong' }, { t: '   ' + nodeText('.when', r), c: 't-dim' }]);
      out.push([{ t: nodeText('.where', r), c: 't-accent' }]);
      out.push(nodeText('p', r));
    });
    return out.length ? out : ['nothing found'];
  }

  function experienceLines() { return rowLines('experience'); }
  function educationLines() { return rowLines('education'); }

  function achievementLines() {
    var box = document.querySelector('#achievements .highlight');
    if (!box) return ['nothing found'];
    return [
      [{ t: nodeText('.big', box) + '  ', c: 't-accent' }, { t: nodeText('h3', box), c: 't-strong' }],
      nodeText('p', box)
    ];
  }

  function contactLines() {
    var out = [], mail = emailAddress();
    if (mail) out.push([{ t: pad('email', 9), c: 't-dim' }, { t: mail, href: 'mailto:' + mail }]);
    out.push([{ t: pad('github', 9), c: 't-dim' }, { t: githubUrl(), href: githubUrl() }]);
    out.push([{ t: pad('linkedin', 9), c: 't-dim' }, { t: LINKEDIN_URL, href: LINKEDIN_URL }]);
    out.push([{ t: pad('cv', 9), c: 't-dim' }, { t: 'cv.pdf', href: 'cv.pdf' }]);
    return out;
  }

  // -------------------------------------------------------------------
  // 5. Projects (from projects.js)
  // -------------------------------------------------------------------
  var projects = [];
  (function () {
    var list = window.SITE_PROJECTS;
    if (!Array.isArray(list)) return;
    var seen = {};
    list.forEach(function (p, i) {
      var slug = slugify(p.title || 'project') || 'project';
      if (seen[slug]) slug += '-' + (i + 1);
      seen[slug] = true;
      projects.push({ slug: slug, data: p });
    });
  })();

  function validLinks(p) {
    return (p.links || []).filter(function (l) { return l && safeUrl(l.url); });
  }

  function projectListLines() {
    if (!projects.length) return ['no projects loaded'];
    var out = [];
    projects.forEach(function (p, i) {
      var head = [{ t: pad(i + 1, 4), c: 't-dim' }, { t: p.data.title || p.slug, c: 't-strong' }];
      if (p.data.flag) head.push({ t: '  [' + p.data.flag + ']', c: 't-accent' });
      out.push(head);
      if (p.data.tags && p.data.tags.length) out.push([{ t: '    ' + p.data.tags.join(', '), c: 't-dim' }]);
    });
    out.push('');
    out.push([{ t: 'open <number> to open one, or cat projects/<name>.md to read about it', c: 't-dim' }]);
    return out;
  }

  function projectFileLines(p) {
    var d = p.data, out = [];
    var head = [{ t: d.title || p.slug, c: 't-strong' }];
    if (d.flag) head.push({ t: '  [' + d.flag + ']', c: 't-accent' });
    out.push(head);
    out.push('');
    out.push(d.description || '');
    if (d.tags && d.tags.length) { out.push(''); out.push([{ t: pad('tags', 8), c: 't-dim' }, d.tags.join(', ')]); }
    var links = validLinks(d);
    if (links.length) {
      links.forEach(function (l, i) {
        out.push([{ t: pad(i ? '' : 'links', 8), c: 't-dim' }, { t: l.url, href: l.url }]);
      });
    } else if (d.note) {
      out.push([{ t: pad('status', 8), c: 't-dim' }, d.note + ', no public link yet']);
    }
    return out;
  }

  function findProject(q) {
    q = String(q || '').toLowerCase().replace(/\.md$/, '').trim();
    if (!q) return null;
    if (/^\d+$/.test(q)) return projects[parseInt(q, 10) - 1] || null;
    var i;
    for (i = 0; i < projects.length; i++) if (projects[i].slug === q) return projects[i];
    for (i = 0; i < projects.length; i++) if (projects[i].slug.indexOf(q) === 0) return projects[i];
    for (i = 0; i < projects.length; i++) if (String(projects[i].data.title).toLowerCase().indexOf(q) !== -1) return projects[i];
    return null;
  }

  // -------------------------------------------------------------------
  // 6. The pretend filesystem
  // -------------------------------------------------------------------
  var DENIED = { t: 'x' };

  function dir(children, opts) {
    var c = Object.create(null);
    Object.keys(children).forEach(function (k) { c[k] = children[k]; });
    var n = { t: 'd', c: c, m: 'drwxr-xr-x', o: 'visitor' };
    if (opts) Object.keys(opts).forEach(function (k) { n[k] = opts[k]; });
    return n;
  }

  function file(content, opts) {
    var n = { t: 'f', c: content, m: '-rw-r--r--', o: 'visitor' };
    if (opts) Object.keys(opts).forEach(function (k) { n[k] = opts[k]; });
    return n;
  }

  var HISTORY_FILE = [
    '    1  ls',
    '    2  cat contact.txt',
    '    3  git push origin main',
    '    4  cd /var/backups',
    '    5  ls -la',
    '    6  cat notes.txt',
    '    7  base64 -d vault.b64 | xor ******',
    '    8  echo "key is my github handle, all lowercase"',
    '    9  echo "got the flag? check it with: submit ALI{...}"',
    '   10  history -c'
  ].join('\n');

  var NOTES_FILE = [
    'backup job: portfolio, weekly',
    'status: ok',
    'todo: move vault.b64 off this box before the site goes public'
  ].join('\n');

  var PASSWD_FILE = [
    'root:x:0:0:root:/root:/bin/bash',
    'visitor:x:1000:1000:Visitor:/home/visitor:/bin/bash',
    'ali:x:1001:1001:Ali Razvi:/home/ali:/bin/bash'
  ].join('\n');

  function buildProjectsDir() {
    var kids = {};
    projects.forEach(function (p) {
      kids[p.slug + '.md'] = file(function () { return projectFileLines(p); });
    });
    return dir(kids);
  }

  // The poems folder is read live from the poems folder of the GitHub repo, so adding a .txt file
  // there is all it takes for a new poem to show up in the terminal.
  var POEMS = { repo: 'Elishane786/Elishane786.github.io', dir: 'poems', status: 'idle' };
  var poemsNode = dir({}, { poems: true });

  function addPoem(name) {
    var text = null;
    poemsNode.c[name] = file(function () {
      return text === null ? ['(opening the page, try again in a second)'] : text.split('\n');
    });
    fetch(POEMS.dir + '/' + name)
      .then(function (r) { if (!r.ok) throw new Error('open failed'); return r.text(); })
      .then(function (t) { text = t.replace(/\r/g, '').replace(/\n+$/, '').slice(0, 20000); })
      .catch(function () { text = '(could not open this one right now)'; });
  }

  function loadPoems() {
    if (POEMS.status !== 'idle') return;
    if (!window.fetch) { POEMS.status = 'failed'; return; }
    POEMS.status = 'loading';
    fetch('https://api.github.com/repos/' + POEMS.repo + '/contents/' + POEMS.dir)
      .then(function (r) { if (!r.ok) throw new Error('listing failed'); return r.json(); })
      .then(function (items) {
        (Array.isArray(items) ? items : []).filter(function (it) {
          return it && it.type === 'file' && /^[A-Za-z0-9_.\-]+\.txt$/.test(it.name);
        }).slice(0, 60).forEach(function (it) { addPoem(it.name); });
        POEMS.status = 'ok';
      })
      .catch(function () { POEMS.status = 'failed'; });
  }

  function poemsNote() {
    if (POEMS.status === 'ok') return 'nothing here yet';
    if (POEMS.status === 'failed') return 'could not reach the poems right now, try again later';
    return 'still loading, try again in a second';
  }

  var HOME = ['home', 'visitor'];

  var ROOT = dir({
    home: dir({
      visitor: dir({
        'about.txt': file(aboutLines),
        'achievements.txt': file(achievementLines),
        'contact.txt': file(contactLines),
        'education.txt': file(educationLines),
        'experience.txt': file(experienceLines),
        'skills.txt': file(skillsLines),
        projects: buildProjectsDir(),
        '.bash_history': file(HISTORY_FILE, { m: '-rw-------' })
      }),
      ali: dir({}, { denied: true, m: 'drwx------', o: 'ali' }),
      personal: dir({
        poems: poemsNode
      })
    }),
    var: dir({
      backups: dir({
        'notes.txt': file(NOTES_FILE, { o: 'root' }),
        'vault.b64': file(VAULT, { o: 'root' })
      }, { o: 'root' })
    }, { o: 'root' }),
    usr: dir({
      local: dir({
        bin: dir({
          xor: file(null, { bin: true, m: '-rwxr-xr-x', o: 'root' })
        }, { o: 'root' })
      }, { o: 'root' })
    }, { o: 'root' }),
    etc: dir({
      hostname: file('portfolio', { o: 'root' }),
      passwd: file(PASSWD_FILE, { o: 'root' })
    }, { o: 'root' })
  }, { o: 'root' });

  var cwd = HOME.slice();

  function resolve(p) {
    var segs;
    if (p === '~' || p.indexOf('~/') === 0) { segs = HOME.slice(); p = p.slice(1); }
    else if (p.charAt(0) === '/') segs = [];
    else segs = cwd.slice();
    p.split('/').forEach(function (s) {
      if (!s || s === '.') return;
      if (s === '..') segs.pop(); else segs.push(s);
    });
    return segs;
  }

  function get(segs) {
    var n = ROOT, i;
    for (i = 0; i < segs.length; i++) {
      if (n.t !== 'd') return null;
      if (n.denied) return DENIED;
      n = n.c[segs[i]];
      if (!n) return null;
    }
    return n;
  }

  function fileLines(node) {
    var c = node.c;
    return typeof c === 'function' ? toLines(c()) : toLines(c);
  }

  function sizeOf(node) {
    if (node.t === 'd') return 4096;
    if (node.bin) return 18432;
    return fileLines(node).map(plainLine).join('\n').length;
  }

  function promptPath() {
    var p = '/' + cwd.join('/');
    var home = '/' + HOME.join('/');
    if (p === home) return '~';
    if (p.indexOf(home + '/') === 0) return '~' + p.slice(home.length);
    return p;
  }

  // A burst of green cursors that rain across the terminal when the flag is accepted.
  // It is purely visual, sits on top of the terminal, ignores clicks, and removes itself.
  function cursorStorm() {
    var term = termBody.closest('.term');
    if (!term) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var box = document.createElement('div');
    box.className = 't-storm';
    box.setAttribute('aria-hidden', 'true');
    var i, c;
    for (i = 0; i < 90; i++) {
      c = document.createElement('span');
      c.className = 't-storm-cur';
      c.style.left = (Math.random() * 100).toFixed(1) + '%';
      c.style.top = (Math.random() * 60 - 10).toFixed(1) + '%';
      c.style.setProperty('--s', (0.6 + Math.random() * 1.2).toFixed(2));
      c.style.setProperty('--dx', Math.round((Math.random() - 0.5) * 140) + 'px');
      c.style.setProperty('--dy', Math.round(120 + Math.random() * 260) + 'px');
      c.style.animationDelay = (Math.random() * 1.1).toFixed(2) + 's';
      c.style.animationDuration = (1.5 + Math.random() * 1.5).toFixed(2) + 's';
      box.appendChild(c);
    }
    term.appendChild(box);
    term.classList.add('t-won');
    setTimeout(function () {
      if (box.parentNode) box.parentNode.removeChild(box);
      term.classList.remove('t-won');
    }, 4000);
  }

  // -------------------------------------------------------------------
  // 7. Commands. Each one gets (args, { stdin }) and returns lines, a string, or { err: 'message' }.
  // -------------------------------------------------------------------
  var COMMANDS = Object.create(null);

  var PUBLIC_NAMES = ['about', 'achievements', 'cat', 'cd', 'clear', 'contact', 'cv', 'echo', 'education',
    'experience', 'github', 'help', 'history', 'linkedin', 'ls', 'open', 'projects', 'pwd', 'skills', 'submit', 'whoami'];

  var hist = [];
  var histIdx = 0;

  function cmdLine(name, text) {
    return [{ t: '  ' + pad(name, 20), c: 't-accent' }, { t: text, c: 't-dim' }];
  }

  COMMANDS.help = function () {
    return [
      [{ t: 'commands', c: 't-strong' }],
      cmdLine('about', 'who I am'),
      cmdLine('projects', 'what I have built'),
      cmdLine('open <n>', 'open a project, for example: open 1'),
      cmdLine('skills', 'languages, security, tools, systems'),
      cmdLine('experience', 'work history'),
      cmdLine('education', 'where I studied'),
      cmdLine('achievements', 'competition results'),
      cmdLine('contact', 'how to reach me'),
      cmdLine('cv', 'open my CV'),
      cmdLine('github', 'open my GitHub'),
      cmdLine('linkedin', 'open my LinkedIn'),
      cmdLine('ls, cd, cat, pwd', 'look around, there is a small filesystem here'),
      cmdLine('clear', 'clear the screen'),
      '',
      [{ t: 'psst: there is a flag hidden in this terminal. Format ALI{...}. Check a guess with: submit <flag>', c: 't-dim' }]
    ];
  };

  COMMANDS.about = aboutLines;
  COMMANDS.skills = skillsLines;
  COMMANDS.experience = experienceLines;
  COMMANDS.education = educationLines;
  COMMANDS.achievements = achievementLines;
  COMMANDS.contact = contactLines;
  COMMANDS.projects = projectListLines;

  COMMANDS.whoami = function () {
    return nodeText('.name-out') || 'Muhammed Ali Razvi';
  };

  COMMANDS.cv = function () {
    openUrl('cv.pdf');
    return [['opening ', { t: 'cv.pdf', href: 'cv.pdf' }]];
  };

  COMMANDS.github = function () {
    var u = githubUrl();
    openUrl(u);
    return [['opening ', { t: u, href: u }]];
  };

  COMMANDS.linkedin = function () {
    openUrl(LINKEDIN_URL);
    return [['opening ', { t: LINKEDIN_URL, href: LINKEDIN_URL }]];
  };

  COMMANDS.email = function () {
    var mail = emailAddress();
    if (!mail) return { err: 'email: not found' };
    return [[{ t: mail, href: 'mailto:' + mail }]];
  };

  COMMANDS.open = function (args) {
    if (!args.length) return { err: 'usage: open <project number or name>' };
    var p = findProject(args.join(' '));
    if (!p) return { err: 'open: no such project. try: projects' };
    var links = validLinks(p.data);
    if (!links.length) return [(p.data.title || p.slug) + ' has no public link yet (' + (p.data.note || 'work in progress') + ')'];
    openUrl(links[0].url);
    return [['opening ', { t: links[0].url, href: links[0].url }]];
  };

  COMMANDS.pwd = function () { return '/' + cwd.join('/'); };

  COMMANDS.cd = function (args) {
    var target = args[0] || '~';
    var node = get(resolve(target));
    if (node === DENIED) return { err: 'cd: ' + target + ': Permission denied' };
    if (!node) return { err: 'cd: ' + target + ': No such file or directory' };
    if (node.t !== 'd') return { err: 'cd: ' + target + ': Not a directory' };
    if (node.denied) return { err: 'cd: ' + target + ': Permission denied' };
    cwd = resolve(target);
  };

  COMMANDS.ls = function (args) {
    var showAll = false, long = false, paths = [];
    args.forEach(function (a) {
      if (a.charAt(0) === '-' && a.length > 1) {
        if (a.indexOf('a') > 0) showAll = true;
        if (a.indexOf('l') > 0) long = true;
      } else paths.push(a);
    });
    if (!paths.length) paths = ['.'];

    var out = [];
    paths.forEach(function (p, idx) {
      var node = get(resolve(p));
      if (node === DENIED || (node && node.denied)) { out.push({ t: "ls: cannot open directory '" + p + "': Permission denied", c: 't-err' }); return; }
      if (!node) { out.push({ t: "ls: cannot access '" + p + "': No such file or directory", c: 't-err' }); return; }
      if (paths.length > 1) { if (idx) out.push(''); out.push(p + ':'); }

      var entries = [];
      if (node.t === 'f') {
        entries.push({ name: p, node: node });
      } else {
        if (showAll) {
          entries.push({ name: '.', node: node });
          entries.push({ name: '..', node: node });
        }
        Object.keys(node.c).sort(function (a, b) {
          return a.replace(/^\./, '').localeCompare(b.replace(/^\./, ''));
        }).forEach(function (name) {
          if (name.charAt(0) === '.' && !showAll) return;
          entries.push({ name: name, node: node.c[name] });
        });
      }

      if (long) {
        entries.forEach(function (e) {
          var isDir = e.node.t === 'd';
          out.push([
            { t: pad(e.node.m, 11) + pad(e.node.o, 9) + pad(e.node.o, 9) + pad(sizeOf(e.node), 7), c: 't-dim' },
            { t: e.name + (isDir ? '/' : ''), c: isDir ? 't-dir' : undefined }
          ]);
        });
      } else if (!entries.length && node.poems) {
        out.push({ t: poemsNote(), c: 't-dim' });
      } else if (entries.length) {
        var line = [];
        entries.forEach(function (e, i) {
          if (i) line.push('  ');
          var isDir = e.node.t === 'd';
          line.push({ t: e.name + (isDir ? '/' : ''), c: isDir ? 't-dir' : undefined });
        });
        out.push(line);
      }
    });
    return out;
  };

  COMMANDS.cat = function (args, ctx) {
    if (!args.length) {
      if (ctx.stdin !== null) return ctx.stdin;
      return { err: 'usage: cat <file>' };
    }
    var out = [], failure = null;
    args.forEach(function (p) {
      if (failure) return;
      var node = get(resolve(p));
      if (node === DENIED || (node && node.denied)) { failure = 'cat: ' + p + ': Permission denied'; return; }
      if (!node) { failure = 'cat: ' + p + ': No such file or directory'; return; }
      if (node.t === 'd') { failure = 'cat: ' + p + ': Is a directory'; return; }
      if (node.bin) { failure = 'cat: ' + p + ': binary file, not shown'; return; }
      out = out.concat(fileLines(node));
    });
    return failure ? { err: failure } : out;
  };

  COMMANDS.echo = function (args) { return args.join(' '); };

  COMMANDS.clear = function () { log.textContent = ''; };

  COMMANDS.history = function (args) {
    if (args[0] === '-c') { hist = []; histIdx = 0; return; }
    return hist.map(function (h, i) { return pad(i + 1, 5) + h; });
  };

  COMMANDS.id = function () { return 'uid=1000(visitor) gid=1000(visitor) groups=1000(visitor)'; };
  COMMANDS.hostname = function () { return 'portfolio'; };
  COMMANDS.uname = function () { return 'Linux portfolio 6.1.0-ali #1 SMP x86_64 GNU/Linux'; };
  COMMANDS.date = function () { return new Date().toString(); };

  COMMANDS.base64 = function (args, ctx) {
    var decode = false, rest = [], input;
    args.forEach(function (a) {
      if (a === '-d' || a === '-D' || a === '--decode') decode = true; else rest.push(a);
    });
    if (rest.length) {
      var node = get(resolve(rest[0]));
      if (node === DENIED || (node && node.denied)) return { err: 'base64: ' + rest[0] + ': Permission denied' };
      if (!node) return { err: 'base64: ' + rest[0] + ': No such file or directory' };
      if (node.t !== 'f' || node.bin) return { err: 'base64: ' + rest[0] + ': cannot read' };
      input = fileLines(node).map(plainLine).join('\n');
    } else if (ctx.stdin !== null) {
      input = ctx.stdin;
    } else {
      return { err: 'usage: base64 [-d] <file>   (or pipe text into it)' };
    }
    try {
      if (decode) {
        var raw = atob(input.replace(/\s+/g, ''));
        var shown = '';
        for (var i = 0; i < raw.length; i++) {
          var code = raw.charCodeAt(i);
          shown += (code >= 32 && code < 127) || code === 10 ? raw.charAt(i) : '.';
        }
        return shown;
      }
      return btoa(input);
    } catch (e) {
      return { err: 'base64: invalid input' };
    }
  };

  COMMANDS.xor = function (args, ctx) {
    var key = args[0];
    if (!key) return { err: 'usage: xor <key> [hexstring]   (reads hex from a pipe if you give none)' };
    var hex = (args.length > 1 ? args.slice(1).join('') : (ctx.stdin || '')).replace(/\s+/g, '');
    if (!hex || /[^0-9a-fA-F]/.test(hex) || hex.length % 2) return { err: 'xor: input must be a hex string' };
    var out = '', i, b;
    for (i = 0; i < hex.length / 2; i++) {
      b = parseInt(hex.substr(i * 2, 2), 16) ^ key.charCodeAt(i % key.length);
      out += b >= 32 && b < 127 ? String.fromCharCode(b) : '.';
    }
    return out;
  };

  COMMANDS.submit = function (args) {
    var guess = args.join(' ').trim();
    if (!guess) return { err: 'usage: submit <flag>   (the format is ALI{...})' };
    if (sha256(guess) === FLAG_HASH) {
      cursorStorm();
      return [
        [{ t: '[+] flag accepted', c: 't-ok t-strong' }],
        '',
        [{ t: 'Most people stop where the surface ends, and that is exactly where everything worth finding begins.', c: 't-fade t-d2' }],
        [{ t: 'The surface is there for everyone, and what lies beneath belongs to the ones who dig.', c: 't-fade t-d3' }],
        '',
        [{ t: 'Tell me how you did it, find me on Discord: ', c: 't-fade t-d4' }, { t: DISCORD_HANDLE, c: 't-accent t-strong t-fade t-d4' }]
      ];
    }
    return [[{ t: '[-] not it, keep digging', c: 't-err' }]];
  };

  // a few jokes, not listed in help
  COMMANDS.sudo = function () { return { err: 'visitor is not in the sudoers file. This incident will be reported.' }; };
  COMMANDS.rm = function () { return { err: 'rm: cannot remove: Read-only file system' }; };
  COMMANDS.exit = function () { return 'logout\nthere is nowhere to go, this is a website. Scroll down instead.'; };
  COMMANDS.man = function () { return 'No manual entry. Try: help'; };
  COMMANDS.nmap = function () { return 'nmap: do you have permission to scan this box? It is a static page, but ask first.'; };
  ['vi', 'vim', 'nano', 'emacs'].forEach(function (n) {
    COMMANDS[n] = function () { return { err: n + ': no editors installed, the visitor account is read-only' }; };
  });

  // -------------------------------------------------------------------
  // 8. Parsing and running a line (supports quotes and pipes)
  // -------------------------------------------------------------------
  function parse(line) {
    var cmds = [], cur = [], tok = '', quote = null, quoted = false, i, ch;
    for (i = 0; i < line.length; i++) {
      ch = line.charAt(i);
      if (quote) { if (ch === quote) quote = null; else tok += ch; continue; }
      if (ch === '"' || ch === "'") { quote = ch; quoted = true; continue; }
      if (ch === '|') {
        if (tok || quoted) cur.push(tok);
        tok = ''; quoted = false;
        cmds.push(cur); cur = [];
        continue;
      }
      if (/\s/.test(ch)) {
        if (tok || quoted) { cur.push(tok); tok = ''; quoted = false; }
        continue;
      }
      tok += ch;
    }
    if (quote) return { error: 'syntax error: unterminated quote' };
    if (tok || quoted) cur.push(tok);
    cmds.push(cur);
    return { cmds: cmds };
  }

  function runLine(line) {
    var parsed = parse(line);
    if (parsed.error) { addLine({ t: parsed.error, c: 't-err' }); return; }
    var stdin = null, i, argv, name, res, lines;
    for (i = 0; i < parsed.cmds.length; i++) {
      argv = parsed.cmds[i];
      if (!argv.length) { addLine({ t: "syntax error near unexpected token `|'", c: 't-err' }); return; }
      name = argv[0];
      if (!(name in COMMANDS)) { addLine({ t: name + ': command not found. Try: help', c: 't-err' }); return; }
      res = COMMANDS[name](argv.slice(1), { stdin: stdin });
      if (res && res.err) { addLine({ t: res.err, c: 't-err' }); return; }
      lines = toLines(res);
      if (i === parsed.cmds.length - 1) {
        lines.forEach(function (l) { addLine(l); });
      } else {
        stdin = lines.map(plainLine).join('\n');
      }
    }
  }

  // -------------------------------------------------------------------
  // 9. The screen: a log of output, then a live prompt
  // -------------------------------------------------------------------
  var log = document.createElement('div');
  log.className = 't-log';
  log.setAttribute('role', 'log');

  var row = document.createElement('div');
  row.className = 't-row';

  var promptEl = document.createElement('span');
  promptEl.className = 't-prompt';

  var input = document.createElement('input');
  input.type = 'text';
  input.className = 't-input';
  input.setAttribute('aria-label', 'terminal input, type help for commands');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('spellcheck', 'false');
  input.setAttribute('enterkeyhint', 'send');
  input.setAttribute('placeholder', 'type help');

  function promptSpans() {
    var a = document.createElement('span');
    a.className = 'prompt';
    a.textContent = 'visitor@portfolio';
    var b = document.createElement('span');
    b.className = 'path';
    b.textContent = ':' + promptPath() + '$';
    return [a, b];
  }

  function refreshPrompt() {
    promptEl.textContent = '';
    promptSpans().forEach(function (s) { promptEl.appendChild(s); });
  }

  function addLine(line) {
    var d = document.createElement('div');
    d.className = 'line';
    normalizeLine(line).forEach(function (seg) {
      if (typeof seg === 'string') { d.appendChild(document.createTextNode(seg)); return; }
      var el, href = seg.href && safeUrl(seg.href);
      if (href) {
        el = document.createElement('a');
        el.href = href;
        if (href.indexOf('mailto:') !== 0) { el.target = '_blank'; el.rel = 'noopener'; }
      } else {
        el = document.createElement('span');
      }
      if (seg.c) el.className = seg.c;
      el.textContent = seg.t;
      d.appendChild(el);
    });
    // an empty line must still take up a row, or blank lines (the gaps between poem verses) collapse
    if (!d.textContent) d.appendChild(document.createTextNode('\u00a0'));
    log.appendChild(d);
    while (log.childNodes.length > 600) log.removeChild(log.firstChild);
  }

  function echoLine(text) {
    var d = document.createElement('div');
    d.className = 'line';
    promptSpans().forEach(function (s) { d.appendChild(s); });
    d.appendChild(document.createTextNode(' '));
    var c = document.createElement('span');
    c.className = 'cmd';
    c.textContent = text;
    d.appendChild(c);
    log.appendChild(d);
  }

  function exec(line) {
    loadPoems();
    echoLine(line);
    var t = line.trim();
    if (!t) return;
    if (hist[hist.length - 1] !== t) hist.push(t);
    histIdx = hist.length;
    try {
      runLine(t);
    } catch (e) {
      addLine({ t: 'terminal: something broke, try again', c: 't-err' });
    }
    refreshPrompt();
    termBody.scrollTop = termBody.scrollHeight;
  }

  // -------------------------------------------------------------------
  // 10. Tab completion
  // -------------------------------------------------------------------
  function commonPrefix(list) {
    var p = list[0], i;
    for (i = 1; i < list.length; i++) {
      while (list[i].indexOf(p) !== 0) p = p.slice(0, -1);
    }
    return p;
  }

  function complete() {
    var v = input.value;
    var m = /^([\s\S]*?)(\S*)$/.exec(v);
    var head = m[1], word = m[2];
    var isCmd = /^\s*$/.test(head) || /\|\s*$/.test(head);
    var options, typed, prefix;

    if (isCmd) {
      typed = word;
      prefix = '';
      options = PUBLIC_NAMES.filter(function (n) { return n.indexOf(word) === 0; });
    } else {
      var slash = word.lastIndexOf('/');
      var dirPart = word.slice(0, slash + 1);
      typed = word.slice(slash + 1);
      prefix = dirPart;
      var node = get(resolve(dirPart || '.'));
      if (!node || node.t !== 'd' || node.denied) return;
      options = Object.keys(node.c).filter(function (n) {
        return n.indexOf(typed) === 0 && (typed.charAt(0) === '.' || n.charAt(0) !== '.');
      }).sort().map(function (n) { return n + (node.c[n].t === 'd' ? '/' : ''); });
    }

    if (!options.length) return;
    if (options.length === 1) {
      input.value = head + prefix + options[0] + (/\/$/.test(options[0]) ? '' : ' ');
      return;
    }
    var common = commonPrefix(options);
    if (common.length > typed.length) { input.value = head + prefix + common; return; }
    echoLine(v);
    addLine(options.join('  '));
    termBody.scrollTop = termBody.scrollHeight;
  }

  // -------------------------------------------------------------------
  // 11. Keyboard and mouse
  // -------------------------------------------------------------------
  var draft = '';

  input.addEventListener('keydown', function (e) {
    if (e.isComposing) return;
    var key = e.key;
    if (key === 'Enter') {
      e.preventDefault();
      var v = input.value;
      input.value = '';
      draft = '';
      exec(v);
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      if (histIdx > 0) {
        if (histIdx === hist.length) draft = input.value;
        histIdx--;
        input.value = hist[histIdx];
      }
    } else if (key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx < hist.length) {
        histIdx++;
        input.value = histIdx === hist.length ? draft : hist[histIdx];
      }
    } else if (key === 'Tab') {
      e.preventDefault();
      complete();
    } else if (e.ctrlKey && (key === 'l' || key === 'L')) {
      e.preventDefault();
      log.textContent = '';
    } else if (e.ctrlKey && (key === 'c' || key === 'C') && input.selectionStart === input.selectionEnd) {
      e.preventDefault();
      echoLine(input.value + '^C');
      input.value = '';
    }
  });

  termBody.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('a')) return;
    var sel = window.getSelection && window.getSelection();
    if (sel && String(sel).length) return;
    input.focus({ preventScroll: true });
  });

  // -------------------------------------------------------------------
  // 12. Mount it into the page
  // -------------------------------------------------------------------
  var cursor = termBody.querySelector('.cursor');
  if (cursor) cursor.parentNode.removeChild(cursor);

  refreshPrompt();
  row.appendChild(promptEl);
  row.appendChild(input);
  termBody.appendChild(log);
  termBody.appendChild(row);

  addLine([{ t: "type 'help' to see what you can run. Tab completes, the up arrow brings back old commands.", c: 't-dim' }]);

  // a playful nudge above the terminal, so visitors know there is a flag to find
  var termBox = termBody.closest('.term');
  if (termBox && termBox.parentNode) {
    var hint = document.createElement('p');
    hint.className = 't-hint';
    var slashes = document.createElement('span');
    slashes.textContent = '// ';
    hint.appendChild(slashes);
    hint.appendChild(document.createTextNode('it is a terminal, like an actual one, so use it like one'));
    termBox.parentNode.insertBefore(hint, termBox);
  }

  // clickable shortcuts under the terminal, for visitors who would rather tap than type
  var term = termBody.closest('.term');
  if (term && term.parentNode) {
    var chips = document.createElement('div');
    chips.className = 't-chips';
    var label = document.createElement('span');
    label.textContent = 'try:';
    chips.appendChild(label);
    ['help', 'projects', 'skills', 'achievements', 'contact'].forEach(function (cmd) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 't-chip';
      b.textContent = cmd;
      b.addEventListener('click', function () { exec(cmd); });
      chips.appendChild(b);
    });
    term.parentNode.insertBefore(chips, term.nextSibling);
  }
})();
