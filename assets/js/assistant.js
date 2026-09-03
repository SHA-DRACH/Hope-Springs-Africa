/* ==========================================================================
   "Ask Hope" — site assistant for Hope Springs Africa
   ==========================================================================

   WHAT THIS IS
   ------------
   A self-contained assistant that answers questions from a curated knowledge
   base built out of this site's own content. It runs entirely in the browser:
   no server, no API key, no network call. That is a deliberate choice, not a
   limitation to work around — see below.

   WHY IT IS NOT A LANGUAGE MODEL
   ------------------------------
   This site is static files served from a PUBLIC GitHub repository. Calling a
   real model (Claude, GPT, Gemini) requires an API key, and any key placed in
   client-side JavaScript is readable by every visitor and every scraper that
   crawls the repo. Keys leaked this way are typically found and abused within
   minutes, billed to the account that owns them. There is no safe way to embed
   one here.

   HOW TO UPGRADE IT TO A REAL MODEL
   ---------------------------------
   Everything below the `resolve()` function is presentation. `resolve()` is
   the single swap point. To move to a real model:

     1. Deploy a small proxy that holds the API key server-side — a Cloudflare
        Worker, Vercel/Netlify function, or any endpoint you control. The key
        lives there as an environment variable and never reaches the browser.
     2. Have that proxy call the model, passing KB (below) as grounding context
        so answers stay factual about Hope Springs Africa.
     3. Replace the body of `resolve()` with:

          async function resolve(question) {
            const r = await fetch('https://your-proxy.example/ask', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ question })
            });
            const data = await r.json();
            return { html: data.answer, links: data.links || [], followups: [] };
          }

        Keep the rest of the file as is. Also add a rate limit on the proxy, or
        a public endpoint becomes a way to spend your model budget.

   Until that proxy exists, the widget below is honest about what it is: the
   footer tells visitors it is a guided assistant, and unmatched questions get
   routed to a human rather than guessed at.
   ========================================================================== */

(function () {
  'use strict';

  /* ====================================================================
     1. Knowledge base — every fact here comes from this site's own pages
     ==================================================================== */
  var KB = [
    {
      id: 'mission',
      title: 'Mission and what we do',
      keywords: ['mission', 'about', 'purpose', 'vision', 'goal',
                 'organization', 'nonprofit', 'hope', 'africa', 'aim'],
      html: '<p><strong>Hope Springs Africa</strong> is a faith-based nonprofit serving children and families in rural Rwanda.</p>' +
            '<p>We work through education and practical programs that help women support their families &mdash; focusing on education, nutrition, life skills and community, while building a foundation for long-term growth.</p>' +
            '<p>Our vision: families throughout Africa living a life of dignity and hope, knowing they have the resources to determine their destiny.</p>',
      links: [{ label: 'About us', href: 'about.html' }],
      followups: ['What programs do you run?', 'Where do you work?', 'What is S.P.R.I.N.G.S.?']
    },
    {
      id: 'where',
      title: 'Where we work',
      keywords: ['where', 'location', 'country', 'rwanda', 'africa', 'village', 'villages',
                 'kigali', 'muhunga', 'based', 'operate', 'region', 'place'],
      html: '<p>All of our programs are in <strong>rural Rwanda</strong> &mdash; currently reaching <strong>9 villages</strong>, with our village work centred on <strong>Muhunga</strong>.</p>' +
            '<p>The U.S. office is at 7 Venture Dr., Suite 104-116, Bluffton, SC 29910.</p>',
      links: [{ label: 'Impact projects', href: 'programs.html' }],
      followups: ['What is your impact so far?', 'Can I visit Rwanda with you?']
    },
    {
      id: 'impact',
      title: 'Impact numbers',
      keywords: ['impact', 'results', 'numbers', 'stats', 'statistics',
                 'reached', 'achieved', 'difference', 'measure', 'people', 'served'],
      html: '<p>Where things stand right now:</p>' +
            '<ul>' +
            '<li><strong>9 villages</strong> reached</li>' +
            '<li><strong>21 children</strong> in school</li>' +
            '<li><strong>140 families</strong> with soap and water filters</li>' +
            '<li><strong>380 people</strong> with health insurance</li>' +
            '</ul>' +
            '<p>Every initiative is tracked, prayed over, and designed for long-term impact.</p>',
      links: [{ label: 'See the projects', href: 'programs.html' }],
      followups: ['What does a donation buy?', 'What is S.P.R.I.N.G.S.?']
    },
    {
      id: 'programs',
      title: 'The six impact projects',
      keywords: ['program', 'programs', 'project', 'projects', 'work', 'initiative',
                 'initiatives', 'services', 'help', 'offer', 'provide', 'six'],
      html: '<p>We run <strong>six impact projects</strong>:</p>' +
            '<ul>' +
            '<li><strong>Water Filters</strong> &mdash; healthier children, fewer illnesses</li>' +
            '<li><strong>Education Essentials</strong> &mdash; uniforms, backpacks, tuition, rain gear</li>' +
            '<li><strong>Menstrual Health</strong> &mdash; hygiene products, soap, toiletries</li>' +
            '<li><strong>College Scholarships</strong> &mdash; tuition via the University of Kagili</li>' +
            '<li><strong>Home Renovations</strong> &mdash; roof repairs, toilets, safe living conditions</li>' +
            '<li><strong>Emergency Help Fund</strong> &mdash; food, insurance, mattresses, jerry cans</li>' +
            '</ul>',
      links: [{ label: 'All six projects', href: 'programs.html' }],
      followups: ['Tell me about water filters', 'How do scholarships work?', 'How can I give?']
    },
    {
      id: 'water',
      title: 'Water filters',
      keywords: ['water', 'filter', 'filters', 'clean', 'drink', 'drinking', 'well',
                 'illness', 'disease', 'sanitation', 'jerry'],
      html: '<p>For a family, a clean water filter means <strong>healthier children, fewer illnesses, and more time for education and work</strong>.</p>' +
            '<p>A filter is <strong>$35</strong>. 140 families now have soap and water filters. We don’t stop at handing them over &mdash; filter maintenance is part of the programme, so they keep working.</p>',
      links: [{ label: 'Water filters', href: 'programs.html#water' }, { label: 'Fund a filter', href: 'give.html#give' }],
      followups: ['What does a donation buy?', 'What else do you provide?']
    },
    {
      id: 'education',
      title: 'Education',
      keywords: ['education', 'school', 'schools', 'children', 'child', 'kids', 'student',
                 'students', 'uniform', 'uniforms', 'backpack', 'tuition', 'books',
                 'learning', 'classroom', 'teach'],
      html: '<p><strong>Education Essentials</strong> removes the things that quietly keep children out of school: uniforms, backpacks, tuition, umbrellas and rain gear for the wet seasons.</p>' +
            '<p><strong>21 children</strong> are in school through the programme. Beyond that, <strong>College Scholarships</strong> provide tuition assistance in partnership with the University of Kagili.</p>',
      links: [{ label: 'Education Essentials', href: 'programs.html#education' }, { label: 'Send a child to school', href: 'give.html#give' }],
      followups: ['How much does it cost to send a child to school?', 'Tell me about scholarships']
    },
    {
      id: 'scholarships',
      title: 'College scholarships',
      keywords: ['scholarship', 'scholarships', 'college', 'university', 'kagili',
                 'higher', 'degree', 'graduate', 'tertiary'],
      html: '<p><strong>College Scholarships</strong> provide tuition assistance through a partnership with the <strong>University of Kagili</strong>, supporting long-term growth and opportunity for selected students.</p>',
      links: [{ label: 'Scholarships', href: 'programs.html#scholarships' }, { label: 'Back a scholar', href: 'give.html#give' }],
      followups: ['What other education support is there?', 'How can I give?']
    },
    {
      id: 'menstrual',
      title: 'Menstrual health',
      keywords: ['menstrual', 'period', 'periods', 'hygiene', 'sanitary', 'pads', 'pad',
                 'girls', 'girl', 'women', 'dignity', 'soap', 'toiletries', 'feminine'],
      html: '<p>Access to feminine hygiene products, soap, toothpaste and lotions is <strong>crucial for girls’ well-being and education</strong> &mdash; without them, girls miss school every month.</p>' +
            '<p>The programme includes <strong>reusable sanitary pad trainings</strong>, so the solution keeps going rather than running out.</p>',
      links: [{ label: 'Menstrual health', href: 'programs.html#health' }, { label: 'Support a girl', href: 'give.html#give' }],
      followups: ['What is S.P.R.I.N.G.S.?', 'How can I give?']
    },
    {
      id: 'homes',
      title: 'Home renovations and emergency help',
      keywords: ['home', 'homes', 'house', 'housing', 'roof', 'toilet', 'renovation',
                 'repair', 'shelter', 'emergency', 'crisis', 'relief', 'widow', 'widows',
                 'elderly', 'mattress', 'mattresses', 'food'],
      html: '<p><strong>Home Renovations</strong> cover roof repairs, rebuilding toilets and improving living conditions for vulnerable families &mdash; restoring dignity and safety.</p>' +
            '<p>The <strong>Emergency Help Fund</strong> provides swift relief: food, health insurance, mattresses, basins, toiletries and jerry cans for the elderly, widows and families in crisis.</p>',
      links: [{ label: 'Home renovations', href: 'programs.html#homes' }, { label: 'Emergency fund', href: 'programs.html#emergency' }],
      followups: ['How can I give?', 'What is your impact so far?']
    },
    {
      id: 'springs',
      title: 'The S.P.R.I.N.G.S. model',
      keywords: ['springs', 'model', 'method', 'approach', 'framework', 'principles',
                 'values', 'acronym', 'sustainable', 'stewardship', 'philosophy'],
      html: '<p><strong>S.P.R.I.N.G.S.™</strong> is the seven commitments every project is measured against:</p>' +
            '<ul>' +
            '<li><strong>S</strong>ustainable &mdash; we create systems that grow</li>' +
            '<li><strong>P</strong>rogress &mdash; every small step matters</li>' +
            '<li><strong>R</strong>elationship &mdash; we walk with people, not ahead of them</li>' +
            '<li><strong>I</strong>nnovation &mdash; creativity rooted in context</li>' +
            '<li><strong>N</strong>urture &mdash; body, mind and spirit</li>' +
            '<li><strong>G</strong>race &mdash; presence and patience, never rushed</li>' +
            '<li><strong>S</strong>tewardship &mdash; we don’t just raise funds, we steward futures</li>' +
            '</ul>' +
            '<p>Where hope springs, transformation flows.</p>',
      links: [{ label: 'Explore the model', href: 'about.html#springs' }],
      followups: ['What programs do you run?', 'Who is on the team?']
    },
    {
      id: 'sifa',
      title: 'Finding Sifa',
      keywords: ['sifa', 'story', 'yvonne', 'rhonda', 'origin', 'began', 'start',
                 'started', 'history', 'founded', 'testimony', 'finding'],
      html: '<p><strong>Finding Sifa</strong> is how this began. Rhonda met siblings on a rural road, then searched three weeks to find them again &mdash; reconnecting with their mother Yvonne just two days before flying home.</p>' +
            '<p>Within one month the children had uniforms, backpacks and paid tuition; the family had books, mattresses and health insurance.</p>' +
            '<p>In Yvonne’s words: <em>&ldquo;My children now have a good place to sleep. They are studying… I thank ma’am Rhonda.&rdquo;</em></p>',
      links: [{ label: 'Read the full story', href: 'about.html#story' }],
      followups: ['Who is on the team?', 'What is your impact so far?']
    },
    {
      id: 'team',
      title: 'The team',
      keywords: ['team', 'staff', 'leader', 'leaders', 'leadership', 'founder',
                 'founders', 'director', 'board', 'rhonda', 'doug', 'mincey', 'ceo',
                 'run', 'runs', 'lead', 'leads', 'manage', 'manages', 'charge',
                 'advisor', 'advisors', 'employee', 'employees'],
      html: '<p><strong>Leadership:</strong> Rhonda G. Mincey, M.Ed. (Chief Executive Officer), Doug Mincey (Operations Director), LeElla Cross (Cultural &amp; Community Ambassador).</p>' +
            '<p><strong>Rwanda operations:</strong> Cynthia Keza (Operations Manager), Enock Junior (Village Director), Gilbert Niyotwizera (Renewal Hub™ Manager).</p>' +
            '<p><strong>Board advisors:</strong> Kaleigh, GiGi Brown and Inshuti Divine.</p>',
      links: [{ label: 'Meet the team', href: 'about.html#team' }],
      followups: ['How did the organization start?', 'How do I contact you?']
    },
    {
      id: 'exchange',
      title: 'Global Creators Exchange',
      keywords: ['exchange', 'youth', 'creators', 'global', 'cultural', 'teen', 'teens',
                 'young', 'leaders', 'trip', 'travel', 'visit', 'safari', 'immersion',
                 'june', '2026', 'dates', 'week', 'rwanda', 'kid', 'kids', 'teen', 'teenager',
                 'son', 'daughter', 'send', 'apply', 'application'],
      html: '<p>The <strong>Global Creators Exchange</strong> is a one-week youth cultural exchange in Rwanda, running <strong>June 4&ndash;11, 2026</strong>.</p>' +
            '<ul>' +
            '<li><strong>4 nights in Kigali</strong> &mdash; culture, history, daily life</li>' +
            '<li><strong>3 nights in Muhunga</strong> &mdash; learning alongside local families</li>' +
            '<li><strong>Creative exchange</strong> &mdash; art, music, games, language</li>' +
            '<li><strong>Safari &amp; reflection</strong> &mdash; conservation and age-appropriate history</li>' +
            '</ul>' +
            '<p>This is not tourism. It’s relationship.</p>',
      links: [{ label: 'The Exchange', href: 'exchange.html' }, { label: 'Interest form', href: 'exchange.html#interest' }],
      followups: ['How do I join a mission trip?', 'How much does it cost?']
    },
    {
      id: 'give',
      title: 'Giving',
      keywords: ['give', 'giving', 'donate', 'donation', 'donations', 'money', 'fund',
                 'support', 'contribute', 'gift', 'cost', 'price', 'amount',
                 'monthly', 'sponsor', 'pay', 'buy'],
      html: '<p>You can give to a specific project or to wherever it’s needed most. What a gift buys:</p>' +
            '<ul>' +
            '<li><strong>$35</strong> &mdash; one water filter</li>' +
            '<li><strong>$120</strong> &mdash; uniform, backpack and tuition for a child</li>' +
            '<li><strong>$300</strong> &mdash; emergency help for a family</li>' +
            '</ul>' +
            '<p>Monthly giving is available, and every gift is tracked against a specific project so you hear back about where yours landed.</p>',
      links: [{ label: 'Give now', href: 'give.html#give-form' }],
      followups: ['Is my donation tax deductible?', 'What is the Hope Rising campaign?']
    },
    {
      id: 'campaign',
      title: 'Hope Rising campaign',
      keywords: ['campaign', 'hope', 'rising', '8k', 'appeal', 'renewal', 'hub',
                 'digital', 'current', 'now', 'fundraiser', 'fundraising', 'goal'],
      html: '<p><strong>Hope Rising from Rwanda: $8K in 30 Days</strong> is the live campaign.</p>' +
            '<p>We’re sharing real stories from the ground while raising $8,000 to strengthen the <strong>Renewal Hub™</strong>, youth initiatives, digital learning and community-based programs.</p>',
      links: [{ label: 'Give to the campaign', href: 'give.html#give-form' }],
      followups: ['What does a donation buy?', 'How else can I help?']
    },
    {
      id: 'tax',
      title: 'Tax status',
      keywords: ['tax', 'deductible', 'deduction', '501', '501c3', 'ein', 'receipt',
                 'nonprofit', 'charity', 'registered', 'legal', 'status'],
      html: '<p>Hope Springs Africa is a <strong>501(c)(3) charitable organization</strong>. All donations are deemed tax-deductible to the fullest extent allowed by law.</p>' +
            '<p>Our <strong>EIN is 93-2778025</strong>.</p>',
      links: [{ label: 'Give', href: 'give.html#give' }],
      followups: ['How do I contact you?', 'How can I give?']
    },
    {
      id: 'volunteer',
      title: 'Going, volunteering and missions',
      keywords: ['volunteer', 'volunteering', 'go', 'mission', 'missions', 'serve',
                 'help', 'join', 'trip', 'travel', 'come', 'participate', 'involved',
                 'intern', 'work'],
      html: '<p>There are four ways in:</p>' +
            '<ul>' +
            '<li><strong>Give</strong> &mdash; support the Renewal Hub™ and beyond</li>' +
            '<li><strong>Go</strong> &mdash; join a mission or support on-the-ground engagement</li>' +
            '<li><strong>Partner</strong> &mdash; as a school, church, business or organization</li>' +
            '<li><strong>Support &amp; Share</strong> &mdash; use your voice, skills or network</li>' +
            '</ul>' +
            '<p>Your yes can spark a ripple of restoration.</p>',
      links: [{ label: 'Get involved', href: 'give.html' }, { label: 'Start a conversation', href: 'give.html#connect' }],
      followups: ['Tell me about the youth exchange', 'How do I partner with you?']
    },
    {
      id: 'partner',
      title: 'Partnering',
      keywords: ['partner', 'partnership', 'church', 'school', 'business', 'corporate',
                 'company', 'organization', 'collaborate', 'sponsor', 'speak',
                 'speaking', 'ambassador', 'media', 'interview'],
      html: '<p>We partner with <strong>schools, churches, businesses and organizations</strong>. We also take speaking invitations, ambassador enquiries and media requests.</p>' +
            '<p>The contact form lets you pick exactly what you’d like to connect about &mdash; a few sentences are plenty.</p>',
      links: [{ label: 'Partner with us', href: 'give.html#partner' }, { label: 'Contact form', href: 'give.html#connect' }],
      followups: ['How do I contact you?', 'How else can I help?']
    },
    {
      id: 'contact',
      title: 'Contact',
      keywords: ['contact', 'email', 'phone', 'reach', 'address', 'talk', 'speak',
                 'message', 'connect', 'get', 'touch', 'call', 'write', 'office',
                 'social', 'instagram', 'facebook', 'newsletter', 'subscribe'],
      html: '<p><strong>Hope Springs Africa</strong><br>7 Venture Dr., Suite 104-116<br>Bluffton, SC 29910, USA</p>' +
            '<p>The contact form covers general questions, partnerships, speaking invitations, volunteering, giving and media requests &mdash; and we reply to every message.</p>' +
            '<p>You can also follow along on Instagram and Facebook, or subscribe to <strong>Hope Rising™</strong> for stories and updates from Rwanda.</p>',
      links: [{ label: 'Contact us', href: 'give.html#connect' }],
      followups: ['How can I give?', 'How do I join a mission trip?']
    },
    {
      id: 'faith',
      title: 'Faith',
      keywords: ['faith', 'christian', 'god', 'bible', 'church', 'religion', 'religious',
                 'jesus', 'scripture', 'verse', 'pray', 'prayer', 'ministry', 'based'],
      html: '<p>Hope Springs Africa is a <strong>faith-based</strong> organization. Faith shows up as love and respect in practice &mdash; we lead with grace and walk with people rather than ahead of them.</p>' +
            '<p><em>&ldquo;Behold, I am doing a new thing; now it springs forth, do you not perceive it? I will make a way in the wilderness and rivers in the desert.&rdquo;</em> &mdash; Isaiah 43:19</p>',
      links: [{ label: 'About us', href: 'about.html' }],
      followups: ['What is S.P.R.I.N.G.S.?', 'How did the organization start?']
    }
  ];

  /* Words that carry no signal for matching. */
  var STOPWORDS = {
    a: 1, an: 1, the: 1, is: 1, are: 1, was: 1, were: 1, be: 1, been: 1, am: 1,
    i: 1, you: 1, your: 1, my: 1, me: 1, we: 1, us: 1, it: 1, its: 1, this: 1,
    that: 1, of: 1, to: 1, in: 1, on: 1, at: 1, for: 1, with: 1, and: 1, or: 1,
    but: 1, if: 1, so: 1, as: 1, by: 1, from: 1, can: 1, could: 1, would: 1,
    should: 1, will: 1, shall: 1, may: 1, might: 1, must: 1, does: 1, did: 1,
    have: 1, has: 1, had: 1, there: 1, here: 1, please: 1, tell: 1,
    know: 1, like: 1, want: 1, need: 1, get: 1, any: 1, some: 1, all: 1,
    // Interrogatives carry no topic signal. Leaving them scoreable let a
    // single entry that happened to list "what" or "who" as a keyword win
    // every question, including ones that should fall through to "I don't
    // know" — so they are filtered out before matching.
    what: 1, who: 1, whom: 1, whose: 1, how: 1, why: 1, when: 1, which: 1,
    do: 1, many: 1, much: 1, else: 1, your: 1, ours: 1
  };

  /* Maps everyday phrasing onto knowledge-base vocabulary. */
  var SYNONYMS = {
    donate: ['give', 'money'], donating: ['give', 'money'], contribute: ['give'],
    contributing: ['give'], funding: ['give', 'fund'], pay: ['give'],
    sponsor: ['give', 'partner'], sponsoring: ['give'],
    kids: ['children'], kid: ['children'], child: ['children'],
    youngsters: ['children', 'youth'], pupils: ['children', 'student'],
    schooling: ['education', 'school'], study: ['education', 'school'],
    studying: ['education', 'school'], learn: ['education'],
    h2o: ['water'], borehole: ['water'], sanitation: ['water', 'hygiene'],
    periods: ['menstrual'], menstruation: ['menstrual'], tampon: ['menstrual'],
    trips: ['trip', 'mission'], visiting: ['visit', 'trip'], tour: ['trip'],
    volunteering: ['volunteer'], helping: ['help', 'volunteer'],
    staff: ['team'], employees: ['team'], founders: ['team', 'founder'],
    price: ['cost'], expensive: ['cost'], budget: ['cost'],
    deductable: ['deductible'], writeoff: ['deductible', 'tax'],
    reach: ['contact'], emailing: ['contact', 'email'],
    signup: ['subscribe', 'newsletter'], mailing: ['newsletter'],
    stats: ['impact'], results: ['impact'], outcomes: ['impact'],
    values: ['springs', 'model'], methodology: ['springs', 'model'],
    located: ['where', 'location'], based: ['where', 'location']
  };

  /* Conversational openers handled before the knowledge base. */
  var SMALLTALK = [
    {
      test: /^(hi|hey|hello|yo|howdy|good (morning|afternoon|evening)|greetings)\b/i,
      html: '<p>Hello, and welcome. I can answer questions about our programs in Rwanda, the S.P.R.I.N.G.S.™ model, giving, the youth exchange, or how to get in touch.</p><p>What would you like to know?</p>',
      followups: ['What programs do you run?', 'How can I give?', 'What is your impact so far?']
    },
    {
      test: /\b(thank|thanks|thx|appreciate|cheers)\b/i,
      html: '<p>You’re very welcome. Is there anything else I can help you find?</p>',
      followups: ['How can I give?', 'How do I contact you?']
    },
    {
      test: /\b(bye|goodbye|see you|later|that’s all|thats all)\b/i,
      html: '<p>Thank you for spending time here. Whatever brought you, we’re glad you came.</p>',
      followups: ['How can I give?']
    },
    {
      test: /\b(are you (a )?(real|human|person|bot|ai|robot)|who are you|what are you)\b/i,
      html: '<p>I’m a guided assistant, not a person and not a language model &mdash; I answer from a fixed set of information taken directly from this site.</p>' +
            '<p>That means I’m accurate about Hope Springs Africa, but narrow. For anything I can’t cover, a real person reads every message sent through the contact form.</p>',
      followups: ['What programs do you run?', 'How do I contact you?']
    },
    {
      test: /\b(help|what can you do|options|menu)\b$/i,
      html: '<p>I can help with:</p><ul><li>Our programs and impact in Rwanda</li><li>The S.P.R.I.N.G.S.™ model</li><li>Giving, and what a donation buys</li><li>The Global Creators Exchange</li><li>Volunteering, partnering and contact details</li></ul>',
      followups: ['What programs do you run?', 'How can I give?', 'Tell me about the youth exchange']
    }
  ];

  var OPENING_CHIPS = [
    'What programs do you run?',
    'How can I give?',
    'What is S.P.R.I.N.G.S.?',
    'Tell me about the youth exchange'
  ];

  /* ====================================================================
     2. Retrieval
     ==================================================================== */
  function tokenize(text) {
    var raw = String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .split(/\s+/);

    var out = [];
    raw.forEach(function (word) {
      var w = word.replace(/^['-]+|['-]+$/g, '');
      if (!w || w.length < 2 || STOPWORDS[w]) return;
      out.push(w);
      // Crude singularisation so "filters" matches "filter".
      if (w.length > 3 && w.slice(-1) === 's' && w.slice(-2) !== 'ss') {
        out.push(w.slice(0, -1));
      }
      if (SYNONYMS[w]) out = out.concat(SYNONYMS[w]);
    });
    return out;
  }

  function scoreEntry(entry, tokens, rawText) {
    var score = 0;
    var seen = {};

    tokens.forEach(function (token) {
      if (seen[token + '|' + entry.id]) return;
      if (entry.keywords.indexOf(token) !== -1) {
        seen[token + '|' + entry.id] = 1;
        score += 3;
      }
    });

    // Title words are a strong signal.
    var titleTokens = tokenize(entry.title);
    tokens.forEach(function (token) {
      if (titleTokens.indexOf(token) !== -1) score += 2;
    });

    // Whole-phrase mention of the entry id (e.g. "springs", "sifa").
    if (rawText.indexOf(entry.id) !== -1) score += 4;

    return score;
  }

  function search(question) {
    var tokens = tokenize(question);
    var raw = String(question).toLowerCase();
    if (!tokens.length) return null;

    var ranked = KB.map(function (entry) {
      return { entry: entry, score: scoreEntry(entry, tokens, raw) };
    }).filter(function (r) {
      return r.score > 0;
    }).sort(function (a, b) {
      return b.score - a.score;
    });

    if (!ranked.length || ranked[0].score < 3) return null;
    return ranked[0].entry;
  }

  /* --------------------------------------------------------------------
     resolve() — THE SWAP POINT. See the header comment to move this to a
     real model behind a server-side proxy.
     -------------------------------------------------------------------- */
  function resolve(question) {
    for (var i = 0; i < SMALLTALK.length; i++) {
      if (SMALLTALK[i].test.test(question.trim())) {
        return {
          html: SMALLTALK[i].html,
          links: [],
          followups: SMALLTALK[i].followups || []
        };
      }
    }

    var hit = search(question);
    if (hit) {
      return { html: hit.html, links: hit.links || [], followups: hit.followups || [] };
    }

    return {
      html: '<p>I don’t have a reliable answer to that one &mdash; and I’d rather say so than guess.</p>' +
            '<p>A real person reads every message sent through the contact form, and we reply to all of them. You could also try asking about our programs, giving, the S.P.R.I.N.G.S.™ model or the youth exchange.</p>',
      links: [{ label: 'Ask a person', href: 'give.html#connect' }],
      followups: OPENING_CHIPS.slice(0, 3)
    };
  }

  /* ====================================================================
     3. Widget
     ==================================================================== */
  var ICON_SPARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.2"/></svg>';
  var ICON_DROP  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.7s6 6.6 6 10.6a6 6 0 0 1-12 0c0-4 6-10.6 6-10.6z"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>';
  var ICON_SEND  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12h13M11.5 6l6 6-6 6"/></svg>';

  function build() {
    var root = document.createElement('div');
    root.className = 'hopebot';
    root.innerHTML =
      '<button class="hopebot__launch" type="button" data-bot-open aria-expanded="false" aria-controls="hopebot-panel">' +
        ICON_SPARK +
        '<span>Ask Hope</span>' +
        '<span class="hopebot__pulse" aria-hidden="true"></span>' +
      '</button>' +
      '<div class="hopebot__panel" id="hopebot-panel" role="dialog" aria-modal="false" aria-label="Ask Hope — site assistant">' +
        '<div class="hopebot__head">' +
          '<span class="hopebot__avatar" aria-hidden="true">' + ICON_DROP + '</span>' +
          '<span class="hopebot__id">' +
            '<span class="hopebot__name">Ask Hope</span>' +
            '<span class="hopebot__status">Guided assistant</span>' +
          '</span>' +
          '<button class="hopebot__close" type="button" data-bot-close aria-label="Close assistant">' + ICON_CLOSE + '</button>' +
        '</div>' +
        '<div class="hopebot__log" data-bot-log role="log" aria-live="polite" aria-atomic="false"></div>' +
        '<div class="hopebot__chips" data-bot-chips></div>' +
        '<form class="hopebot__form" data-bot-form>' +
          '<label class="sr-only" for="hopebot-input">Ask a question</label>' +
          '<textarea class="hopebot__input" id="hopebot-input" data-bot-input rows="1" ' +
            'placeholder="Ask about our work in Rwanda…" autocomplete="off"></textarea>' +
          '<button class="hopebot__send" type="submit" data-bot-send aria-label="Send">' + ICON_SEND + '</button>' +
        '</form>' +
        '<p class="hopebot__foot">Answers come from this site’s own content, not a language model. ' +
          'For anything else, <a href="give.html#connect">a person will reply</a>.</p>' +
      '</div>';
    document.body.appendChild(root);
    return root;
  }

  function init() {
    if (document.querySelector('.hopebot')) return;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var root    = build();
    var launch  = root.querySelector('[data-bot-open]');
    var closeBt = root.querySelector('[data-bot-close]');
    var panel   = root.querySelector('.hopebot__panel');
    var log     = root.querySelector('[data-bot-log]');
    var chips   = root.querySelector('[data-bot-chips]');
    var form    = root.querySelector('[data-bot-form]');
    var input   = root.querySelector('[data-bot-input]');
    var busy    = false;

    function scrollDown() { log.scrollTop = log.scrollHeight; }

    function addBot(html, links) {
      var el = document.createElement('div');
      el.className = 'hopebot__msg hopebot__msg--bot';
      el.innerHTML = html;                       // authored above, never user input
      if (links && links.length) {
        var bar = document.createElement('div');
        bar.className = 'hopebot__links';
        links.forEach(function (l) {
          var a = document.createElement('a');
          a.href = l.href;
          a.textContent = l.label;               // textContent, not innerHTML
          bar.appendChild(a);
        });
        el.appendChild(bar);
      }
      log.appendChild(el);
      scrollDown();
    }

    function addUser(text) {
      var el = document.createElement('div');
      el.className = 'hopebot__msg hopebot__msg--user';
      el.textContent = text;                     // user input is never parsed as HTML
      log.appendChild(el);
      scrollDown();
    }

    function setChips(list) {
      chips.innerHTML = '';
      (list || []).forEach(function (label) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'hopebot__chip';
        b.textContent = label;
        b.addEventListener('click', function () { ask(label); });
        chips.appendChild(b);
      });
    }

    function showTyping() {
      var el = document.createElement('div');
      el.className = 'hopebot__typing';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<span></span><span></span><span></span>';
      log.appendChild(el);
      scrollDown();
      return el;
    }

    function ask(question) {
      var text = String(question).trim();
      if (!text || busy) return;

      busy = true;
      addUser(text);
      setChips([]);
      input.value = '';
      input.style.height = 'auto';

      var typing = showTyping();
      // A brief pause reads as considered rather than canned.
      var wait = reduceMotion ? 0 : 380 + Math.min(text.length * 9, 480);

      window.setTimeout(function () {
        typing.remove();
        var result = resolve(text);
        addBot(result.html, result.links);
        setChips(result.followups && result.followups.length ? result.followups : OPENING_CHIPS);
        busy = false;
      }, wait);
    }

    /* Open / close ---------------------------------------------------- */
    var greeted = false;

    function setOpen(open) {
      root.classList.toggle('is-open', open);
      launch.setAttribute('aria-expanded', String(open));

      if (open) {
        if (!greeted) {
          greeted = true;
          addBot(
            '<p>Hello — I’m <strong>Ask Hope</strong>, the guide for this site.</p>' +
            '<p>I can answer questions about our work in rural Rwanda, how giving works, ' +
            'the S.P.R.I.N.G.S.™ model and the youth exchange. Where would you like to start?</p>',
            []
          );
          setChips(OPENING_CHIPS);
        }
        window.setTimeout(function () { input.focus({ preventScroll: true }); }, 320);
      } else {
        launch.focus({ preventScroll: true });
      }
    }

    launch.addEventListener('click', function () { setOpen(true); });
    closeBt.addEventListener('click', function () { setOpen(false); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('is-open')) setOpen(false);
    });

    /* Composer -------------------------------------------------------- */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      ask(input.value);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        ask(input.value);
      }
    });

    // Grow the textarea with its content, up to the CSS max-height.
    input.addEventListener('input', function () {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 110) + 'px';
    });

    // Keep Tab inside the panel while it is open on small screens, where it
    // covers the page entirely.
    panel.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !root.classList.contains('is-open')) return;
      if (!window.matchMedia('(max-width: 560px)').matches) return;
      var f = panel.querySelectorAll('button, textarea, a[href]');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
