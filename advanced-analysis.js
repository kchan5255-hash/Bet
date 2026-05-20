const fs = require('fs');
const puppeteer = require('puppeteer');
const paths = require('./paths');
const F = require('./features-pro');

const RACE_DATA_FILE = process.env.RACE_DATA_FILE || paths.miscPath('graphql-race-data.json');
const HEADLESS = process.env.HEADLESS !== 'false';
const CONCURRENCY = Number(process.env.CONCURRENCY || 7);
const TOP_N = Number(process.env.TOP_N || 6);
const OUTPUT_FILE = process.env.OUTPUT_FILE || 'analysis-results.json';
const PRINT_JSON = process.env.PRINT_JSON === 'true';

function readMeeting() {
  const payload = JSON.parse(fs.readFileSync(RACE_DATA_FILE, 'utf8'));
  const item = payload.find((entry) => entry.data?.data?.raceMeetings);
  if (!item) {
    throw new Error(`No raceMeetings response found in ${RACE_DATA_FILE}`);
  }
  return item.data.data.raceMeetings[0];
}

const meeting = readMeeting();

const numberValue = F.numberValue;

function raceClassNo(race) {
  const match = String(race.raceClass_en || '').match(/Class\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function declaredRunners(race) {
  return race.runners
    .filter((runner) => runner.status === 'Declared' && runner.no)
    .map((runner) => ({
      no: runner.no,
      name: runner.name_ch,
      englishName: runner.name_en,
      code: runner.horse?.code,
      draw: numberValue(runner.barrierDrawNumber),
      handicapWeight: numberValue(runner.handicapWeight),
      bodyWeight: numberValue(runner.currentWeight),
      rating: numberValue(runner.currentRating),
      last6run: runner.last6run,
      jockey: (runner.jockey?.name_ch || '').trim(),
      trainer: (runner.trainer?.name_ch || '').trim(),
      gearInfo: (runner.gearInfo || '').trim(),
      allowance: (runner.allowance || '').trim(),
      trainerPreference: numberValue(runner.trainerPreference),
      trumpCard: Boolean(runner.trumpCard),
      priority: Boolean(runner.priority),
    }));
}

async function scrapeHorse(browser, code) {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (['image', 'media', 'font', 'stylesheet'].includes(request.resourceType())) {
      request.abort();
    } else {
      request.continue();
    }
  });

  try {
    await page.goto(
      `https://racing.hkjc.com/racing/information/English/Horse/Horse.aspx?HorseNo=${encodeURIComponent(code)}`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );

    const data = await page.evaluate(() => {
      const clean = (value) => (value || '').replace(/\s+/g, ' ').trim();
      const tables = [...document.querySelectorAll('table')].map((table) => ({
        rows: [...table.querySelectorAll('tr')]
          .map((tr) => [...tr.querySelectorAll('th,td')].map((td) => clean(td.innerText)).filter(Boolean))
          .filter((row) => row.length),
      }));

      const profile = {};
      for (const table of tables) {
        for (const row of table.rows) {
          if (row.length >= 3 && row[1] === ':') {
            profile[row[0]] = row.slice(2).join(' ');
          }
        }
      }

      const performanceTable = tables.find((table) =>
        table.rows.some((row) => row.includes('Race Index') && row.includes('Pla.') && row.includes('Win Odds'))
      );

      let records = [];
      if (performanceTable) {
        const headerIndex = performanceTable.rows.findIndex(
          (row) => row.includes('Race Index') && row.includes('Pla.')
        );
        records = performanceTable.rows
          .slice(headerIndex + 1)
          .filter((row) => row.length >= 16 && /^\d+$/.test(row[0]) && /^\d{1,2}$/.test(row[1]))
          .map((row) => ({
            place: row[1],
            date: row[2],
            track: row[3],
            distance: row[4],
            going: row[5],
            classNo: row[6],
            draw: row[7],
            rating: row[8],
            trainer: row[9],
            jockey: row[10],
            lbw: row[11],
            odds: row[12],
            actWt: row[13],
            bodyWeight: row[16],
          }));
      }

      return { profile, records };
    });

    await page.close();
    return { code, ...data };
  } catch (error) {
    await page.close().catch(() => {});
    return { code, profile: {}, records: [], error: error.message };
  }
}

async function scrapeVeterinaryRecords(browser) {
  const page = await browser.newPage();
  await page.goto('https://racing.hkjc.com/en-us/local/information/overecord', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  const rows = await page.evaluate(() => {
    const clean = (value) => (value || '').replace(/\s+/g, ' ').trim();
    return [...document.querySelectorAll('tr')]
      .map((tr) => [...tr.querySelectorAll('th,td')].map((td) => clean(td.innerText)).filter(Boolean))
      .filter((row) => row.length);
  });
  await page.close();

  const records = new Map();
  let raceNo = null;
  for (const row of rows) {
    if (row.length === 1 && /^Race \d+/.test(row[0])) {
      raceNo = Number(row[0].match(/\d+/)[0]);
      continue;
    }

    if (raceNo && row.length >= 5 && /^\d+$/.test(row[0])) {
      const runnerNo = row[0];
      const detail = row[4] || '';
      let risk = 0.06;
      if (/bled|heart|ligament|injury|fractious|fell|withdrawn|unacceptable/i.test(detail)) risk = 0.09;
      if (/substantial mucus|lame|blood|irregular/i.test(detail)) risk = 0.08;
      records.set(`${raceNo}-${runnerNo}`, {
        date: row[3],
        detail,
        passedOn: row[5] || '',
        risk,
      });
    }
  }

  return records;
}

function scoreRace(race, detailsByCode, veterinaryRecords) {
  const declared = declaredRunners(race);
  const raceDate = new Date(race.postTime);
  const classNo = raceClassNo(race);

  const enriched = declared.map((runner) => {
    const details = detailsByCode.get(runner.code) || { profile: {}, records: [] };
    const ageText = details.profile['Country of Origin / Age'] || '';
    const colorSex = details.profile['Color / Sex'] || '';
    const sex = (colorSex.split('/').pop() || '').trim();
    return {
      ...runner,
      age: ageText,
      sex,
      careerStats: details.profile['No. of 1-2-3-Starts*'] || '',
      records: details.records || [],
    };
  });

  const withFeatures = F.buildFeatures(enriched, {
    venue: meeting.venueCode,
    distance: numberValue(race.distance),
    classNo,
    going: race.go_en,
    raceDate,
  });

  const rows = withFeatures.map((runner) => {
    const features = runner.features;
    const veterinary = veterinaryRecords.get(`${race.no}-${runner.no}`);
    const veterinaryPenalty = veterinary ? veterinary.risk : 0;
    const rawScore = F.originalRawScore(features) - veterinaryPenalty;

    const positives = [];
    const negatives = [];
    if (features.recent >= 0.6) positives.push('recent-form');
    else if (features.recent < 0.4) negatives.push('weak-recent-form');
    if (features.courseDistance >= 0.6) positives.push('course-distance');
    else if (features.courseDistance < 0.42) negatives.push('unproven-course-distance');
    if (features.rating >= 0.75) positives.push('rating-edge');
    else if (features.rating <= 0.2) negatives.push('low-rating');
    if (features.draw >= 0.82) positives.push('draw-edge');
    else if (features.draw <= 0.4) negatives.push('wide-or-bad-draw');
    if (features.weight >= 0.75) positives.push('light-weight');
    else if (features.weight <= 0.15) negatives.push('heavy-weight');
    if (features.freshness >= 0.8) positives.push('freshness');
    if (features.body >= 0.75) positives.push('stable-body-weight');
    if (veterinary) negatives.push('veterinary-record');

    return {
      ...runner,
      features,
      veterinary,
      rawScore,
      modelProbability: 0,
      positives,
      negatives,
    };
  });

  const probs = F.softmaxProb(rows.map((r) => r.rawScore), rows.length, 'orig');
  rows.forEach((row, i) => { row.modelProbability = probs[i]; });

  return rows.sort((a, b) => b.modelProbability - a.modelProbability);
}

async function run() {
  const horseCodes = [
    ...new Set(meeting.races.flatMap((race) => declaredRunners(race).map((runner) => runner.code).filter(Boolean))),
  ];

  console.error(`Meeting ${meeting.date} ${meeting.venueCode}: ${meeting.races.length} races, ${horseCodes.length} horses`);

  const browser = await puppeteer.launch({ headless: HEADLESS, args: ['--no-sandbox'] });
  const veterinaryRecords = await scrapeVeterinaryRecords(browser);
  const horseDetails = [];
  let cursor = 0;

  async function worker() {
    while (cursor < horseCodes.length) {
      const code = horseCodes[cursor++];
      const details = await scrapeHorse(browser, code);
      horseDetails.push(details);
      console.error(`Fetched ${horseDetails.length}/${horseCodes.length} ${code} ${details.records?.length || 0}`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await browser.close();

  const detailsByCode = new Map(horseDetails.map((details) => [details.code, details]));
  const results = meeting.races.map((race) => ({
    raceNo: race.no,
    raceName: race.raceName_ch,
    distance: race.distance,
    className: race.raceClass_ch,
    going: race.go_ch,
    course: race.raceCourse?.description_ch,
    postTime: race.postTime,
    runners: scoreRace(race, detailsByCode, veterinaryRecords),
  }));

  for (const race of results) {
    console.log(`\nR${race.raceNo} ${race.raceName} ${race.distance}m ${race.className} ${race.going}`);
    console.log('Rank\tNo\tHorse\tProb%\tScore\tDraw\tWt\tRtg\tPositives\tNegatives\tVet');
    race.runners.slice(0, TOP_N).forEach((runner, index) => {
      console.log([
        index + 1,
        runner.no,
        runner.name,
        runner.modelProbability.toFixed(2),
        runner.rawScore.toFixed(3),
        runner.draw,
        runner.handicapWeight,
        runner.rating,
        runner.positives.join('+') || '-',
        runner.negatives.join('+') || '-',
        runner.veterinary ? `${runner.veterinary.date} ${runner.veterinary.detail}` : '',
      ].join('\t'));
    });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf8');
  console.error(`Full analysis written to ${OUTPUT_FILE}`);

  if (PRINT_JSON) {
    console.log('\nJSON_RESULT_START');
    console.log(JSON.stringify(results, null, 2));
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
