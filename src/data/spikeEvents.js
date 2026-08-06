/**
 * Curated explanations for spikes visible in the Tor usage data.
 *
 * Every entry here was written by starting from a spike the detector in
 * `src/utils/spikes.js` actually flags in `public/data/`, then finding
 * contemporaneous reporting for that window — not the other way round. The
 * `window` is the span the elevated readings cover; `peak` is the highest day.
 *
 * Fields:
 *   scope     — country codes the explanation applies to, or '*' for spikes
 *               that showed up across many countries at once.
 *   dataType  — 'relay' | 'bridge'; some events moved only one of the two.
 *               (People reach for bridges when direct relay access is blocked,
 *               so a censorship event often shows in bridges but not relays.)
 *   category  — see CATEGORIES below; drives marker colour.
 *
 * `category: 'anomaly'` is deliberate and load-bearing. The largest spikes in
 * this dataset are NOT censorship events — they are botnets or unexplained
 * counting artifacts, and labelling them as human behaviour would be wrong.
 * Where no cause was ever established we say so rather than guessing.
 */

/**
 * Marker colours. Each category carries both themes, because these are painted
 * onto a canvas and cannot inherit a CSS variable: a single slate that reads
 * well on the dark background disappears against the light one.
 */
export const CATEGORIES = {
  shutdown: {
    label: 'Internet shutdown',
    color: '#ef4444',
    colorLight: '#dc2626',
    description: 'Connectivity cut or throttled at the national level.',
  },
  censorship: {
    label: 'Blocking / censorship',
    color: '#f59e0b',
    colorLight: '#b45309',
    description: 'Platforms, VPNs, or Tor itself blocked or unblocked.',
  },
  unrest: {
    label: 'Protest / political event',
    color: '#a855f7',
    colorLight: '#7e22ce',
    description: 'Elections, coups, or mass protests driving demand for Tor.',
  },
  anomaly: {
    // Slate rather than a hue, so it reads as "not a real event".
    label: 'Botnet / metrics anomaly',
    color: '#94a3b8',
    colorLight: '#64748b',
    description: 'Machine traffic or a counting artifact, not human users.',
  },
}

// Markers with no explanation at all. Highest contrast in the palette on
// purpose — "nobody knows" is the state most worth noticing.
export const UNEXPLAINED = {
  label: 'Unexplained',
  color: '#f1f5f9',
  colorLight: '#1e293b',
  description: 'Detected, but no reporting matched and not part of a network-wide move.',
}

export function categoryColor(entry, theme) {
  return theme === 'light' ? entry.colorLight : entry.color
}

/**
 * The category a marker should be painted with, resolved in the same priority
 * order the labelling in App.jsx uses: curated event, then the Tor Project's
 * timeline, then a network-wide anomaly, then nothing.
 */
export function markerCategory(spike) {
  // A period note is coloured by what it contains: a half-year holding a
  // national shutdown reads differently from one holding only platform blocks.
  if (spike.kind === 'period') {
    return spike.period.shutdowns > 0 ? CATEGORIES.shutdown : CATEGORIES.censorship
  }
  if (spike.event) return CATEGORIES[spike.event.category] || UNEXPLAINED
  if (spike.anomaly) return CATEGORIES.anomaly
  return UNEXPLAINED
}

const EVENTS = [
  {
    id: 'mevade-2013',
    scope: '*',
    // Bridges too. The global bridge line spikes 6× on 19 Sep 2013, inside the
    // same window, and the rise is spread evenly across countries (the largest
    // is 10% of it) — the signature of a globally distributed botnet rather
    // than of anything national.
    dataType: ['relay', 'bridge'],
    window: ['2013-08-19', '2013-10-05'],
    peak: '2013-09-17',
    category: 'anomaly',
    title: 'Mevade/Sefnit botnet joins the Tor network',
    summary:
      'Tor relay users went from roughly 1 million to over 11 million in three weeks — still the largest relative jump in the dataset. It was not people. The Mevade (Sefnit) malware family had added a Tor module, and every infected machine registered as a new client. Roger Dingledine noted at the time that "with a growth curve like this one, there\'s basically no way that there\'s a new human behind each of these new Tor clients." Because the botnet was globally distributed, this spike appears in almost every country file at once, which is the signature to watch for.',
    sources: [
      {
        title: 'How to handle millions of new Tor clients',
        publisher: 'The Tor Project',
        url: 'https://blog.torproject.org/how-handle-millions-new-tor-clients/',
      },
      {
        title: 'Massive spike of Tor users caused by Mevade botnet',
        publisher: 'Help Net Security',
        url: 'https://www.helpnetsecurity.com/2013/09/06/massive-spike-of-tor-users-caused-by-mevade-botnet/',
      },
      {
        title: 'Mevade Botnet',
        publisher: 'Wikipedia',
        url: 'https://en.wikipedia.org/wiki/Mevade_Botnet',
      },
    ],
  },
  {
    id: 'tr-social-media-2014',
    scope: ['tr'],
    dataType: ['relay'],
    window: ['2014-03-20', '2014-04-06'],
    peak: '2014-03-30',
    category: 'censorship',
    title: 'Turkey blocks Twitter, then YouTube',
    summary:
      'Turkish authorities blocked Twitter on 20 March 2014 and YouTube on 27 March, after leaked audio recordings of then-Prime Minister Erdoğan circulated online. Turkish Tor usage roughly tripled over the following fortnight. The Twitter block ran for about two weeks and ended when the Constitutional Court ruled it unconstitutional.',
    sources: [
      {
        title: 'Turkey blocks YouTube days after Twitter crackdown',
        publisher: 'BBC News',
        url: 'https://www.bbc.com/news/world-europe-26773702',
      },
      {
        title: 'Turkey maintains Tor block, flicks social networks offline',
        publisher: 'TechCrunch',
        url: 'https://techcrunch.com/2016/12/20/turkey-blocks-internet-whatsapp-twitter-assassination/',
      },
    ],
  },
  {
    id: 'ug-election-2016',
    scope: ['ug'],
    dataType: ['relay'],
    window: ['2016-02-17', '2016-02-27'],
    peak: '2016-02-20',
    category: 'unrest',
    title: 'Uganda blocks social media on election day',
    summary:
      'The Uganda Communications Commission ordered Facebook, Twitter, Instagram, WhatsApp and mobile money services blocked on 18 February 2016, an hour after presidential voting opened, citing an unspecified national security threat. Ugandan Tor usage jumped roughly fourteen-fold over the next two days. The block held for four days.',
    sources: [
      {
        title: 'Uganda blocks social media and mobile phone services during voting',
        publisher: 'Committee to Protect Journalists',
        url: 'https://cpj.org/2016/02/uganda-blocks-social-media-and-mobile-phone-servic/',
      },
      {
        title: 'Uganda blocks Twitter and Facebook on election day',
        publisher: 'Access Now',
        url: 'https://www.accessnow.org/uganda-twitter-facebook-mtn-block/',
      },
    ],
  },
  {
    id: 'ae-2017-unexplained',
    scope: ['ae'],
    dataType: ['relay', 'bridge'],
    window: ['2017-01-15', '2017-03-20'],
    peak: '2017-02-03',
    category: 'anomaly',
    title: 'UAE surge — cause never established',
    summary:
      'UAE relay users rose from a baseline near 8,000 to almost 470,000, and bridge users from a few hundred to over 130,000. The scale is far out of proportion to the country, and the Tor Project itself has never explained it: Roger Dingledine wrote that "over the past two years there was a huge spike in users from UAE, and then they disappeared again," floating the possibilities that somebody integrated Tor into another app, or that Tor was miscounting clients that requested but never received the consensus document. Real censorship pressure did exist in the same period — a new cybercrime law and a ban on using VPNs for "criminal" purposes — but that does not by itself account for the magnitude.',
    sources: [
      {
        title: 'The Next Chapter in Anti-Censorship (see comments on the UAE spike)',
        publisher: 'The Tor Project',
        url: 'https://blog.torproject.org/next-chapter-anti-censorship/',
      },
      {
        title: 'United Arab Emirates: Freedom on the Net 2017',
        publisher: 'Freedom House',
        url: 'https://freedomhouse.org/country/united-arab-emirates/freedom-net/2017',
      },
    ],
  },
  {
    id: 'tr-tor-vpn-block-2016',
    scope: ['tr'],
    dataType: ['relay'],
    window: ['2016-12-08', '2017-01-05'],
    peak: '2016-12-13',
    category: 'censorship',
    title: 'Turkey blocks Tor and commercial VPNs',
    summary:
      'Following social media restrictions imposed after the December 2016 Istanbul attacks, Turkish ISPs were ordered to block Tor and a list of commercial VPN services, with the Tor block taking effect around 18 December. Direct connections from Turkey climbed as users tried to reach the network and then fell away as the block bedded in — one reason relay counts alone are a poor censorship signal for Turkey after this point.',
    sources: [
      {
        title: 'Tor blocked in Turkey as government cracks down on VPN use',
        publisher: 'Turkey Blocks',
        url: 'https://turkeyblocks.org/2016/12/18/tor-blocked-in-turkey-vpn-ban/',
      },
      {
        title: 'Turkey Partially Blocks Access to Tor and Some VPNs',
        publisher: 'BleepingComputer',
        url: 'https://www.bleepingcomputer.com/news/government/turkey-partially-blocks-access-to-tor-and-some-vpns/',
      },
    ],
  },
  {
    id: 'ua-russian-sites-2017',
    scope: ['ua'],
    dataType: ['bridge'],
    window: ['2017-05-15', '2017-06-20'],
    peak: '2017-05-25',
    category: 'censorship',
    title: 'Ukraine bans VKontakte, Odnoklassniki, Yandex and Mail.ru',
    summary:
      'President Poroshenko signed a decree on 15 May 2017 enacting sanctions that required ISPs to block the major Russian internet platforms. VK alone had accounts held by roughly 78% of Ukrainian internet users. Ukrainian Tor bridge usage rose more than twenty-fold as users looked for ways back in; Human Rights Watch called for the ban to be revoked.',
    sources: [
      {
        title: 'Ukraine: Revoke Ban on Dozens of Russian Web Companies',
        publisher: 'Human Rights Watch',
        url: 'https://www.hrw.org/news/2017/05/17/ukraine-revoke-ban-dozens-russian-web-companies',
      },
      {
        title: 'Poroshenko Restricts Access To Russian Websites, Social Networks',
        publisher: 'RFE/RL',
        url: 'https://www.rferl.org/a/ukraine-poroshenko-restricts-access-yandex-vkontakte/28490951.html',
      },
    ],
  },
  {
    id: 'ir-telegram-block-2018',
    scope: ['ir'],
    dataType: ['bridge'],
    window: ['2018-05-01', '2018-06-05'],
    peak: '2018-05-23',
    category: 'censorship',
    title: 'Iran blocks Telegram, then blocks Tor',
    summary:
      'An assistant prosecutor ordered Telegram — used by an estimated 40 million Iranians — blocked on 30 April 2018, with the judicial order specifying that the block be implemented so the content could not be reached "through any anti-censorship program." Iran began blocking Tor directly on 1 May, so Iranian usage shifted from direct relay connections onto bridges, which is why this event shows in the bridge series rather than the relay series.',
    sources: [
      {
        title: 'Telegram blocked in Iran as the government orders telecoms to cut off access',
        publisher: 'TechCrunch',
        url: 'https://techcrunch.com/2018/04/30/is-telegram-blocked-iran-april/',
      },
      {
        title: "Iran's Telegram Ban Reveals New Authority By Judiciary",
        publisher: 'Center for Human Rights in Iran',
        url: 'https://iranhumanrights.org/2018/05/irans-telegram-ban-reveals-new-authority-by-judiciary-to-directly-order-online-content-to-blocked/',
      },
    ],
  },
  {
    id: 'iq-isis-shutdown-2014',
    scope: ['iq'],
    dataType: ['relay'],
    window: ['2014-06-12', '2014-07-20'],
    peak: '2014-06-20',
    category: 'shutdown',
    title: 'Iraq blocks social media and cuts service after ISIS takes Mosul',
    summary:
      'After ISIS seized Mosul and Tikrit, the Telecoms Ministry blocked Facebook, Twitter and YouTube on 13 June 2014, ordered a full internet shutdown across five northern and central provinces, and blocked VPNs nationwide, on the reasoning that ISIS was using social platforms to organise. Iraqi Tor users rose roughly fourteen-fold, from a baseline near 1,000 to over 15,000, alongside a comparable surge in Psiphon.',
    sources: [
      {
        title: 'Tor and Psiphon Users Are on the Rise in Iraq Since the ISIS Invasion',
        publisher: 'VICE',
        url: 'https://www.vice.com/en/article/iraqs-isis-targeting-internet-bans-have-caused-a-huge-surge-in-tor-usage/',
      },
      {
        title: 'Iraq: Blanket ban on access to the Internet is a violation of Freedom of Expression',
        publisher: 'ARTICLE 19',
        url: 'https://www.article19.org/resources/iraq-blanket-ban-access-internet-violation-freedom-expression/',
      },
      {
        title: 'Information Controls in Iraq',
        publisher: 'Citizen Lab',
        url: 'https://citizenlab.ca/research/monitoring-information-controls-in-iraq/',
      },
    ],
  },
  {
    id: 'bd-social-media-block-2015',
    scope: ['bd'],
    dataType: ['relay'],
    window: ['2015-11-17', '2015-12-16'],
    peak: '2015-12-08',
    category: 'censorship',
    title: 'Bangladesh blocks Facebook, WhatsApp and Viber for 22 days',
    summary:
      'On 18 November 2015 Bangladesh blocked Facebook, Messenger, WhatsApp, Viber, Line and Tango on security grounds, after the Supreme Court upheld death sentences against two opposition leaders convicted over the 1971 war. Bangladeshi Tor users went from roughly 2,000 to over 22,000 across the block, which was lifted after 22 days.',
    sources: [
      {
        title: 'Tor use skyrockets in Bangladesh after government bans social networks',
        publisher: 'The Daily Dot',
        url: 'https://www.dailydot.com/irl/bangladesh-social-media-ban-tor-encryption-anonymity-protests/',
      },
      {
        title: 'With Messaging Apps Still Banned, Bangladeshis Turn to Tor (and Twitter)',
        publisher: 'Global Voices Advox',
        url: 'https://advox.globalvoices.org/2015/11/25/with-messaging-apps-still-banned-bangladeshis-turn-to-tor-and-twitter/',
      },
    ],
  },
  {
    id: 'ir-protests-2018-01',
    scope: ['ir'],
    dataType: ['bridge'],
    window: ['2017-12-30', '2018-01-20'],
    peak: '2018-01-07',
    category: 'unrest',
    title: 'Iran blocks Telegram and Instagram during the winter protests',
    summary:
      'Protests over inflation and economic conditions began in Mashhad on 28 December 2017 and spread nationwide within ten days. Authorities blocked Telegram and Instagram on 31 December — the platforms protesters were using to organise and to circulate video — and then moved against Tor itself, pushing Iranian users onto bridges. OONI measurements from the period confirm the blocks.',
    sources: [
      {
        title: 'Iran Protests: OONI data confirms censorship events',
        publisher: 'OONI',
        url: 'https://ooni.org/post/2018-iran-protests',
      },
      {
        title: 'Iran internet survey shows extent of Telegram blocks and censorship amid protests',
        publisher: 'NetBlocks',
        url: 'https://netblocks.org/reports/iran-internet-survey-shows-extent-of-telegram-blocks-and-censorship-amid-protests-Pryb4A7n',
      },
      {
        title: 'Iranians resist internet censorship amid deadly street protests',
        publisher: 'The Register',
        url: 'https://www.theregister.com/security/2018/01/02/iranians_resist_internet_censorship_amid_deadly_street_protests/403568',
      },
    ],
  },
  {
    id: 'ru-tor-block-2021',
    scope: ['ru'],
    dataType: ['bridge'],
    window: ['2021-12-10', '2022-01-12'],
    peak: '2021-12-20',
    category: 'censorship',
    title: 'Russia blocks Tor',
    summary:
      'Rostelecom began blocking Tor on 1 December 2021, with MTS and Tele2 following on 3 December, and Roskomnadzor added torproject.org to the register of prohibited information by 7 December. Russia was Tor\'s second-largest user base at the time — over 300,000 daily users, around 15% of the network. Direct connections fell and bridge usage roughly tripled as the Tor Project called for volunteers to run more bridges.',
    sources: [
      {
        title: 'Russia started blocking Tor',
        publisher: 'OONI',
        url: 'https://ooni.org/post/2021-russia-blocks-tor/',
      },
      {
        title: 'Responding to Tor censorship in Russia',
        publisher: 'The Tor Project',
        url: 'https://blog.torproject.org/tor-censorship-in-russia/',
      },
      {
        title: 'Tor (dirauths and default bridges) blocked by certain Russian ISPs since 2021-12-01',
        publisher: 'net4people/bbs',
        url: 'https://github.com/net4people/bbs/issues/97',
      },
    ],
  },
  {
    id: 'bd-uprising-2024',
    scope: ['bd'],
    dataType: ['relay'],
    window: ['2024-07-16', '2024-08-12'],
    peak: '2024-08-04',
    category: 'shutdown',
    title: 'Bangladesh shuts down the internet during the 2024 uprising',
    summary:
      'During the student-led uprising of July and August 2024, Bangladesh imposed the longest and most extensive internet shutdown in its history: a nationwide blackout from the evening of 18 July, broadband restored after five days and mobile after eleven, with Facebook, Instagram, YouTube, WhatsApp and Signal blocked for fourteen days and VPNs targeted. The Tor spike lands in early August, as connectivity returned while platform blocks remained and the protests peaked.',
    sources: [
      {
        title: "The Longest Silence: Internet Shutdowns During Bangladesh's 2024 Uprising",
        publisher: 'OONI',
        url: 'https://ooni.org/post/2025-bangladesh-report/',
      },
      {
        title: "#KeepItOn: Bangladesh's government must restore internet access",
        publisher: 'Access Now',
        url: 'https://www.accessnow.org/press-release/keepiton-restore-internet-during-student-protests-bangladesh/',
      },
    ],
  },
  {
    id: 'ir-relay-unblock-2019',
    scope: ['ir'],
    dataType: ['relay'],
    window: ['2019-05-18', '2019-06-25'],
    peak: '2019-06-19',
    category: 'censorship',
    title: 'Iran briefly unblocks Tor relays',
    summary:
      'Iranian relay users went from a baseline near 90,000 to over 1.3 million — the country\'s largest relay reading on record — because the block on Tor relays was lifted rather than tightened. Direct connections were possible for roughly a week before the blocks were reinstated and the count collapsed back. It is a useful reminder that in heavily censored countries a spike in the relay series can mean censorship easing, not intensifying.',
    sources: [
      {
        title: 'The History of Tor Usage in Iran',
        publisher: 'Tech for Humanity Lab, Virginia Tech',
        url: 'https://techforhumanitylab.clahs.vt.edu/2024-3-15-the-history-of-tor-usage-in-iran/',
      },
      {
        title: 'Measuring Tor and Iran',
        publisher: 'The Tor Project',
        url: 'https://blog.torproject.org/measuring-tor-and-iran/',
      },
    ],
  },
  {
    id: 'by-election-2020',
    scope: ['by'],
    dataType: ['bridge'],
    window: ['2020-08-08', '2020-08-16'],
    peak: '2020-08-10',
    category: 'shutdown',
    title: 'Belarus shuts down the internet on election day',
    summary:
      'Belarusian networks lost routing on the morning of 9 August 2020 as polls opened in the disputed presidential election, in a disruption that ran about 61 hours. Directly connecting Tor users dropped sharply while bridge users rose to more than six times their previous level — the classic shape of a shutdown: the relay line falls, the bridge line spikes. Counts returned to normal on 11 August, until renewed attempts to block Tor began that October.',
    sources: [
      {
        title: 'Some insights into the blocking of Tor in Belarus',
        publisher: 'net4people/bbs',
        url: 'https://github.com/net4people/bbs/issues/72',
      },
      {
        title: 'Internet disruption hits Belarus on election day',
        publisher: 'NetBlocks',
        url: 'https://netblocks.org/reports/internet-disruption-hits-belarus-on-election-day-YAE2jKB3',
      },
      {
        title: 'Tor and Psiphon activity surges in protest-stricken Belarus',
        publisher: 'Decrypt',
        url: 'https://decrypt.co/38443/tor-and-psiphon-activity-surges-in-protest-stricken-belarus',
      },
    ],
  },
  {
    id: 'mm-coup-2021',
    scope: ['mm'],
    dataType: ['relay', 'bridge'],
    window: ['2021-02-01', '2021-03-10'],
    peak: '2021-02-13',
    category: 'unrest',
    title: 'Myanmar military coup and rolling blackouts',
    summary:
      'The military seized power on 1 February 2021. ISPs began blocking Facebook within days, then Twitter and Instagram on 5 February; the internet was shut down entirely for nearly 30 hours on 6 February, and nightly shutdowns began on 15 February. Myanmar Tor usage rose roughly forty-fold against its baseline over the month.',
    sources: [
      {
        title: 'Myanmar: Data on internet blocks and internet outages following military coup',
        publisher: 'OONI',
        url: 'https://ooni.org/post/2021-myanmar-internet-blocks-and-outages/',
      },
      {
        title: 'Myanmar junta blocks internet access as coup protests expand',
        publisher: 'PBS NewsHour',
        url: 'https://www.pbs.org/newshour/world/myanmar-junta-blocks-internet-access-as-coup-protests-expand',
      },
    ],
  },
  {
    id: 'ir-mahsa-amini-2022',
    scope: ['ir'],
    dataType: ['relay', 'bridge'],
    window: ['2022-09-16', '2022-10-25'],
    peak: '2022-09-24',
    category: 'unrest',
    title: 'Iran protests after the death of Mahsa Amini',
    summary:
      'Mahsa Jina Amini died in custody on 16 September 2022, triggering nationwide protests. From 21 September the government imposed a nightly "digital curfew" on mobile networks and blocked WhatsApp, Signal, Skype and Instagram. Iranian bridge users went from a baseline under 2,000 to nearly 190,000 — a hundred-fold rise, and the largest bridge event in the dataset. OONI, the Tor Project and others published a joint technical report on the shutdowns.',
    sources: [
      {
        title: 'Technical multi-stakeholder report on Internet shutdowns: the case of Iran amid autumn 2022 protests',
        publisher: 'OONI',
        url: 'https://ooni.org/post/2022-iran-technical-multistakeholder-report',
      },
      {
        title: 'Internet disrupted in Iran amid protests over death of Mahsa Amini',
        publisher: 'NetBlocks',
        url: 'https://netblocks.org/reports/internet-disrupted-in-iran-amid-protests-over-death-of-mahsa-amini-X8qVEwAD',
      },
    ],
  },
  {
    id: 'tm-censorship-business-2025',
    scope: ['tm'],
    dataType: ['bridge'],
    window: ['2025-04-25', '2025-05-15'],
    peak: '2025-05-02',
    category: 'censorship',
    title: 'Turkmenistan reinstates blocking after its "internet amnesty"',
    summary:
      'Turkmenistan relaxed its large-scale IP blocking for several months in mid-2024, making Tor reachable again, then reinstated censorship that December. The Tor Project has documented how officials at the state Cyber Security agency sell VPN and unblocking access privately — access keys around $50 a month — making the blocking itself a revenue stream. Bridge usage spiked roughly twenty-fold in the window when the grey VPN business resumed in spring 2025.',
    sources: [
      {
        title: 'Corruption and Control: How Turkmenistan turned internet censorship into a business',
        publisher: 'The Tor Project',
        url: 'https://blog.torproject.org/Corruption-Control-Turkmenistan-internet-censorship-business/',
      },
      {
        title: 'Turkmenistan: Tightening Digital Controls and Repression of Dissent',
        publisher: 'International Partnership for Human Rights',
        url: 'https://iphronline.org/articles/turkmenistan-tightening-digital-controls-and-domestic-and-transnational-repression/',
      },
    ],
  },
  {
    id: 'ir-israel-conflict-2025',
    scope: ['ir'],
    dataType: ['bridge'],
    window: ['2025-06-13', '2025-06-30'],
    peak: '2025-06-16',
    category: 'shutdown',
    title: 'Iran near-total blackout during the conflict with Israel',
    summary:
      'Fighting began on 13 June 2025 and Iranian connectivity degraded through the following week, with the government blocking platforms and urging citizens to remove WhatsApp. Bridge usage spiked on 16 June as users routed around the partial blocks, then the government cut connectivity almost entirely on 18 June — a roughly 97% drop in traffic, which NetBlocks called the most severe outage since November 2019. Tehran said the shutdown was defensive, to blunt Israeli cyberattacks.',
    sources: [
      {
        title: 'Iran enters near-total internet blackout, NetBlocks says',
        publisher: 'Iran International',
        url: 'https://www.iranintl.com/en/202506187429',
      },
      {
        title: "Iran's government says it shut down internet to protect against cyberattacks",
        publisher: 'TechCrunch',
        url: 'https://techcrunch.com/2025/06/20/irans-government-says-it-shut-down-internet-to-protect-against-cyberattacks',
      },
      {
        title: '2025 internet blackout in Iran',
        publisher: 'Wikipedia',
        url: 'https://en.wikipedia.org/wiki/2025_Internet_blackout_in_Iran',
      },
    ],
  },
  {
    id: 'de-surge-2017',
    // Also scoped to the global series: this one country is what moved the
    // worldwide line, so the global chart should say so rather than shrug.
    scope: ['de', 'global'],
    dataType: ['relay'],
    window: ['2017-10-01', '2018-03-25'],
    peak: '2018-01-28',
    category: 'anomaly',
    title: 'Winter 2017–18 plateau — Germany-led, and the December DDoS',
    summary:
      'German relay users sat around 4.5× their normal level for roughly six months, from October 2017 into March 2018, peaking near 1.9 million against a baseline under 200,000. This is what pulled worldwide usage up about 95% between mid-2017 and January 2018 and held it there for a quarter — the largest sustained move in the record outside the 2013 botnet. The Netherlands (4.1×) and France (2.9×) rose alongside it, the same hosting-heavy jurisdictions that dominate later anomalies. The Tor Project never established a cause, but its own metrics timeline records the sequence and points at one: the second and steepest leg began on 10 December 2017, and on 20 December David Goulet reported an ongoing distributed denial-of-service against many relays, severe enough to exhaust their memory and force restarts. The German count then fell from 1.5M to 650k over 5–8 March 2018, coinciding with the release of tor 0.3.2.10, 0.3.1.10 and 0.2.9.15, which added DoS resistance. Attack traffic counted as clients would explain both the size and the geography, since the count reflects the addresses making directory requests. Tor logs this as a coincidence rather than a finding, and so do we. The identical pattern recurred in Germany in June 2023 and was again investigated without a cause being found.',
    sources: [
      {
        title: 'Ongoing DDoS on the Network — Status (20 December 2017)',
        publisher: 'David Goulet, tor-project mailing list',
        url: 'https://archive.torproject.org/websites/lists.torproject.org/pipermail/tor-project/2017-December/001604.html',
      },
      {
        title: 'Analysis of the German relay-user increase (metrics analysis #24669)',
        publisher: 'The Tor Project',
        url: 'https://gitlab.torproject.org/tpo/network-health/metrics/analysis/-/issues/24669',
      },
      {
        title: 'Sudden sharp increase in direct Tor users in Germany (the 2023 recurrence, investigated and unresolved)',
        publisher: 'Tor Project Forum',
        url: 'https://forum.torproject.org/t/sudden-sharp-increase-in-direct-tor-users-in-germany-1-5m/8164',
      },
      {
        title: 'Users — Tor Metrics (how client counts are estimated)',
        publisher: 'The Tor Project',
        url: 'https://metrics.torproject.org/userstats-relay-country.html',
      },
    ],
  },
  {
    id: 'ir-bridge-migration-2019',
    scope: ['ir'],
    dataType: ['bridge'],
    window: ['2019-08-20', '2020-02-25'],
    peak: '2019-12-17',
    category: 'censorship',
    title: 'Iran moves onto bridges, through the November 2019 blackout',
    summary:
      'Iranian bridge usage sat around 11× its former level for roughly six months. Iran blocks Tor relays with an IP access list — trivial, because the relay list is public — so circumvention groups pushed users onto bridges, whose addresses are not published. Mid-period the government cut the country off entirely: after a 300% fuel price rise on 15 November 2019, Iran shut down the internet for about a week, and bridge users fell to zero before rebounding past 150,000 when connectivity returned. The blackout is the drop inside this band, not a gap in the data.',
    sources: [
      {
        title: 'The History of Tor Usage in Iran',
        publisher: 'Tech for Humanity Lab, Virginia Tech',
        url: 'https://techforhumanitylab.clahs.vt.edu/2024-3-15-the-history-of-tor-usage-in-iran/',
      },
      {
        title: '2019 Internet blackout in Iran',
        publisher: 'Wikipedia',
        url: 'https://en.wikipedia.org/wiki/2019_Internet_blackout_in_Iran',
      },
      {
        title: 'Iran Shuts Down Internet Amid Violent Protests Over Gas-Price Hikes',
        publisher: 'RFE/RL',
        url: 'https://www.rferl.org/a/iran-shuts-down-internet-amid-violent-protests-over-gas-price-hikes/30278936.html',
      },
    ],
  },
  {
    id: 'de-surge-2023',
    scope: ['de', 'global'],
    dataType: ['relay'],
    window: ['2023-06-01', '2024-05-10'],
    peak: '2023-09-17',
    category: 'anomaly',
    title: 'German surge of June 2023 — investigated, never explained',
    summary:
      'German relay users rose by about 1.5 million over three days in early June 2023 and then stayed roughly 5.5× baseline for nearly a year, peaking above 3.5 million. Contributors on the Tor forum established that "Germany is solely responsible for this", ruled out the Conjure release and found no matching news, and the Tor Project opened a ticket to analyse it; no cause was ever published. The consensus guess was automated traffic rather than people. This one country is most of the worldwide rise visible across 2023 and 2024.',
    sources: [
      {
        title: 'Sudden sharp increase in direct Tor users in Germany (+1.5M)',
        publisher: 'Tor Project Forum',
        url: 'https://forum.torproject.org/t/sudden-sharp-increase-in-direct-tor-users-in-germany-1-5m/8164',
      },
      {
        title: 'Drastic increase in Tor clients from Germany',
        publisher: 'Hacker News',
        url: 'https://news.ycombinator.com/item?id=36560136',
      },
    ],
  },
  {
    id: 'metrics-anomaly-2025-09',
    scope: '*',
    dataType: ['relay'],
    window: ['2025-08-30', '2025-10-18'],
    peak: '2025-09-02',
    category: 'anomaly',
    title: 'Unexplained worldwide surge — no cause established',
    summary:
      'Directly connecting users went from around 2.5 million to roughly 20 million in under three days at the start of September 2025, then oscillated between about 12 and 16 million for weeks. The rise landed simultaneously across the United States, Germany, the Netherlands, France, Canada, Russia and, oddly, Senegal — a spread no single country\'s politics explains. Discussion on the Tor forum has not produced an answer; the leading guess is that someone found a way to manipulate the client-counting system. Treat this period as unreliable rather than as a real change in usage.',
    sources: [
      {
        title: 'Tor metrics — huge increase and wild variations in number of users',
        publisher: 'Tor Project Forum',
        url: 'https://forum.torproject.org/t/tor-metrics-huge-increase-and-wild-variations-in-number-of-users/20687',
      },
      {
        title: 'Users — Tor Metrics',
        publisher: 'The Tor Project',
        url: 'https://metrics.torproject.org/userstats-relay-country.html',
      },
    ],
  },
]

export default EVENTS

/**
 * Find the curated event that explains a detected spike, if there is one.
 * A spike matches when the date windows overlap and the country/data type are
 * in the event's scope. '*' scope events (botnets, counting artifacts) match
 * any country, and are checked last so a country-specific explanation always
 * wins over a global one.
 */
export function matchEvent(spike, country, dataType) {
  const cc = (country || '').toLowerCase()
  const overlaps = (e) =>
    e.dataType.includes(dataType) &&
    spike.start <= e.window[1] &&
    spike.end >= e.window[0]

  const specific = EVENTS.find(
    e => e.scope !== '*' && e.scope.includes(cc) && overlaps(e)
  )
  if (specific) return specific

  return EVENTS.find(e => e.scope === '*' && overlaps(e)) || null
}

/**
 * Fallback for spikes with no curated event: did this window see many
 * countries jump at once? `anomalies` comes from public/data/{type}/
 * anomalies.json, written by detect-anomalies.mjs.
 *
 * This is checked only after matchEvent returns nothing, so a researched
 * national event is never overridden by the fact that other countries also
 * happened to move that month.
 */
export function matchAnomaly(spike, anomalies) {
  if (!anomalies || anomalies.length === 0) return null
  return anomalies.find(a => spike.start <= a.end && spike.end >= a.start) || null
}
